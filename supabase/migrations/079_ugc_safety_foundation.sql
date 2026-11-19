-- Phase 1 foundation for Apple Guideline 1.2 (UGC safety).
-- Additive only: terms acceptance audit, member_blocks, content_reports.
-- Does not change feed/message SELECT policies yet (Phase 2).
-- Safe to rerun: IF NOT EXISTS / DROP POLICY IF EXISTS / CREATE OR REPLACE.

-- ---------------------------------------------------------------------------
-- 1. Terms of Use acceptance (versioned, per auth user)
-- ---------------------------------------------------------------------------

create table if not exists public.member_terms_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  terms_version text not null,
  accepted_at timestamptz not null default now(),
  source text not null default 'unknown',
  user_agent text,
  constraint member_terms_acceptances_version_check
    check (char_length(trim(terms_version)) > 0 and char_length(terms_version) <= 64),
  constraint member_terms_acceptances_source_check
    check (source in ('web', 'ios', 'unknown')),
  constraint member_terms_acceptances_user_version_unique
    unique (user_id, terms_version)
);

create index if not exists member_terms_acceptances_user_id_idx
  on public.member_terms_acceptances (user_id, accepted_at desc);

alter table public.member_terms_acceptances enable row level security;

drop policy if exists "Users can read own terms acceptances"
  on public.member_terms_acceptances;
create policy "Users can read own terms acceptances"
  on public.member_terms_acceptances
  for select
  to authenticated
  using (user_id = auth.uid() or public.current_user_is_admin());

-- Inserts only via accept_elitetee_terms() (security definer). No direct client insert.
revoke all on table public.member_terms_acceptances from anon;
grant select on table public.member_terms_acceptances to authenticated;

create or replace function public.accept_elitetee_terms(
  p_terms_version text,
  p_source text default 'unknown'
)
returns public.member_terms_acceptances
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_source text := lower(coalesce(nullif(trim(p_source), ''), 'unknown'));
  v_version text := trim(coalesce(p_terms_version, ''));
  v_row public.member_terms_acceptances;
begin
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if char_length(v_version) = 0 or char_length(v_version) > 64 then
    raise exception 'A valid terms version is required.';
  end if;

  if v_source not in ('web', 'ios', 'unknown') then
    raise exception 'Invalid terms acceptance source.';
  end if;

  insert into public.users (id, email)
  values (v_user_id, nullif(v_email, ''))
  on conflict (id) do update
    set email = coalesce(excluded.email, public.users.email);

  insert into public.member_terms_acceptances (user_id, terms_version, source)
  values (v_user_id, v_version, v_source)
  on conflict (user_id, terms_version) do nothing;

  select *
  into v_row
  from public.member_terms_acceptances
  where user_id = v_user_id
    and terms_version = v_version;

  if not found then
    raise exception 'Terms acceptance could not be recorded.';
  end if;

  return v_row;
end;
$$;

revoke all on function public.accept_elitetee_terms(text, text) from public;
grant execute on function public.accept_elitetee_terms(text, text) to authenticated;

create or replace function public.has_accepted_elitetee_terms(p_terms_version text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and exists (
      select 1
      from public.member_terms_acceptances mta
      where mta.user_id = auth.uid()
        and mta.terms_version = trim(coalesce(p_terms_version, ''))
    );
$$;

revoke all on function public.has_accepted_elitetee_terms(text) from public;
grant execute on function public.has_accepted_elitetee_terms(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Member blocks (schema + RLS; UI and feed filtering in Phase 2)
-- ---------------------------------------------------------------------------

create table if not exists public.member_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_user_id uuid not null references public.users (id) on delete cascade,
  blocked_user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint member_blocks_no_self_block check (blocker_user_id <> blocked_user_id),
  constraint member_blocks_pair_unique unique (blocker_user_id, blocked_user_id)
);

create index if not exists member_blocks_blocker_idx
  on public.member_blocks (blocker_user_id, created_at desc);

create index if not exists member_blocks_blocked_idx
  on public.member_blocks (blocked_user_id, created_at desc);

alter table public.member_blocks enable row level security;

drop policy if exists "Members can read own blocks" on public.member_blocks;
create policy "Members can read own blocks"
  on public.member_blocks
  for select
  to authenticated
  using (
    blocker_user_id = auth.uid()
    or public.current_user_is_admin()
  );

drop policy if exists "Members can create own blocks" on public.member_blocks;
create policy "Members can create own blocks"
  on public.member_blocks
  for insert
  to authenticated
  with check (
    blocker_user_id = auth.uid()
    and blocked_user_id <> auth.uid()
    and public.current_user_has_portal_access()
  );

drop policy if exists "Members can delete own blocks" on public.member_blocks;
create policy "Members can delete own blocks"
  on public.member_blocks
  for delete
  to authenticated
  using (blocker_user_id = auth.uid());

-- No UPDATE policy: blocks are insert/delete only.

revoke all on table public.member_blocks from anon;
grant select, insert, delete on table public.member_blocks to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Content reports (schema + RLS; UI and admin console in Phase 2)
-- ---------------------------------------------------------------------------

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references public.users (id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  target_user_id uuid references public.users (id) on delete set null,
  reason text not null,
  details text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.users (id) on delete set null,
  resolution_notes text,
  constraint content_reports_target_type_check
    check (target_type in ('feed_post', 'feed_comment', 'private_message', 'member_profile')),
  constraint content_reports_reason_check
    check (
      char_length(trim(reason)) > 0
      and char_length(reason) <= 120
    ),
  constraint content_reports_details_check
    check (details is null or char_length(details) <= 2000),
  constraint content_reports_status_check
    check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  constraint content_reports_resolution_notes_check
    check (resolution_notes is null or char_length(resolution_notes) <= 4000)
);

create index if not exists content_reports_status_created_idx
  on public.content_reports (status, created_at asc);

create index if not exists content_reports_reporter_idx
  on public.content_reports (reporter_user_id, created_at desc);

create index if not exists content_reports_target_idx
  on public.content_reports (target_type, target_id);

create unique index if not exists content_reports_open_unique_idx
  on public.content_reports (reporter_user_id, target_type, target_id)
  where status in ('open', 'reviewing');

alter table public.content_reports enable row level security;

drop policy if exists "Members can create own content reports" on public.content_reports;
create policy "Members can create own content reports"
  on public.content_reports
  for insert
  to authenticated
  with check (
    reporter_user_id = auth.uid()
    and public.current_user_has_portal_access()
    and status = 'open'
    and reviewed_at is null
    and reviewed_by is null
    and resolution_notes is null
  );

drop policy if exists "Members can read own content reports" on public.content_reports;
create policy "Members can read own content reports"
  on public.content_reports
  for select
  to authenticated
  using (
    reporter_user_id = auth.uid()
    or public.current_user_is_admin()
  );

drop policy if exists "Admins can update content reports" on public.content_reports;
create policy "Admins can update content reports"
  on public.content_reports
  for update
  to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

-- No DELETE for members; admins may soft-close via status instead.
revoke all on table public.content_reports from anon;
grant select, insert on table public.content_reports to authenticated;
grant update on table public.content_reports to authenticated;
