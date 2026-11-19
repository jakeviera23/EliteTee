-- Guideline 1.2 hardening on top of 079/080.
-- - Block filtering for AI member search, course rounds, likes, saves
-- - RPC-only content report inserts
-- - Admin email allowlist table (keep in sync with VITE_ADMIN_EMAILS / ADMIN_NOTIFY_EMAILS)
-- Safe to rerun.

-- ---------------------------------------------------------------------------
-- 1. Admin email allowlist (source of truth for current_user_is_admin)
-- ---------------------------------------------------------------------------

create table if not exists public.admin_email_allowlist (
  email text primary key,
  created_at timestamptz not null default now(),
  constraint admin_email_allowlist_email_check
    check (email = lower(trim(email)) and position('@' in email) > 1)
);

-- Seed before switching current_user_is_admin() onto this table.
insert into public.admin_email_allowlist (email)
values (lower('jakeviera23@gmail.com'))
on conflict (email) do nothing;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.admin_email_allowlist a
    where a.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.current_user_is_admin() from public;
grant execute on function public.current_user_is_admin() to authenticated;

alter table public.admin_email_allowlist enable row level security;

drop policy if exists "Admins can read admin email allowlist"
  on public.admin_email_allowlist;
create policy "Admins can read admin email allowlist"
  on public.admin_email_allowlist
  for select
  to authenticated
  using (public.current_user_is_admin());

revoke all on table public.admin_email_allowlist from anon;
grant select on table public.admin_email_allowlist to authenticated;

-- ---------------------------------------------------------------------------
-- 2. RPC-only content reports (block direct client INSERT bypass)
-- ---------------------------------------------------------------------------

drop policy if exists "Members can create own content reports" on public.content_reports;

revoke insert on table public.content_reports from authenticated;
revoke insert on table public.content_reports from anon;
-- SELECT/UPDATE grants remain; inserts occur only via submit_content_report() SECURITY DEFINER.

-- ---------------------------------------------------------------------------
-- 3. AI member search: exclude blocked members
-- ---------------------------------------------------------------------------

drop function if exists public.ai_search_portal_members(jsonb, integer);

create function public.ai_search_portal_members(
  p_filters jsonb default '{}'::jsonb,
  p_limit integer default 20
)
returns table (
  user_id uuid,
  full_name text,
  primary_club text,
  based_in text,
  regions text,
  industry text,
  profession text,
  golf_interests text,
  business_interests text,
  current_request text,
  traveling_to text,
  club_logo_url text,
  cover_photo_url text,
  founding_member_number text,
  is_verified boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with filters as (
    select
      lower(trim(coalesce(p_filters ->> 'query', ''))) as q,
      lower(trim(coalesce(p_filters ->> 'location', ''))) as loc,
      lower(trim(coalesce(p_filters ->> 'interest', ''))) as interest,
      lower(trim(coalesce(p_filters ->> 'travel', ''))) as travel,
      lower(trim(coalesce(p_filters ->> 'home_club', ''))) as home_club
  )
  select
    mp.user_id,
    mp.full_name,
    mp.primary_club,
    mp.based_in,
    coalesce(mp.regions::text, '') as regions,
    mp.industry,
    coalesce(mp.profession, '') as profession,
    coalesce(mp.golf_interests::text, '') as golf_interests,
    coalesce(mp.business_interests::text, '') as business_interests,
    mp.current_request,
    coalesce(mp.traveling_to, '') as traveling_to,
    mp.club_logo_url,
    mp.cover_photo_url,
    mp.founding_member_number,
    mp.is_verified
  from public.member_profiles mp
  cross join filters f
  where mp.portal_access_enabled = true
    and mp.user_id is not null
    and mp.user_id <> auth.uid()
    and public.current_user_has_portal_access()
    and (
      public.current_user_is_admin()
      or not public.members_are_blocked(auth.uid(), mp.user_id)
    )
    and (
      f.q = ''
      or lower(mp.full_name) like '%' || f.q || '%'
      or lower(mp.based_in) like '%' || f.q || '%'
      or lower(mp.primary_club) like '%' || f.q || '%'
      or lower(coalesce(mp.traveling_to, '')) like '%' || f.q || '%'
      or lower(coalesce(mp.industry, '')) like '%' || f.q || '%'
      or lower(coalesce(mp.profession, '')) like '%' || f.q || '%'
      or lower(coalesce(mp.current_request, '')) like '%' || f.q || '%'
      or lower(coalesce(mp.regions::text, '')) like '%' || f.q || '%'
      or lower(coalesce(mp.golf_interests::text, '')) like '%' || f.q || '%'
      or lower(coalesce(mp.business_interests::text, '')) like '%' || f.q || '%'
    )
    and (
      f.loc = ''
      or lower(mp.based_in) like '%' || f.loc || '%'
      or lower(coalesce(mp.regions::text, '')) like '%' || f.loc || '%'
      or lower(coalesce(mp.traveling_to, '')) like '%' || f.loc || '%'
    )
    and (
      f.interest = ''
      or lower(coalesce(mp.golf_interests::text, '')) like '%' || f.interest || '%'
      or lower(coalesce(mp.business_interests::text, '')) like '%' || f.interest || '%'
      or lower(coalesce(mp.current_request, '')) like '%' || f.interest || '%'
      or lower(coalesce(mp.industry, '')) like '%' || f.interest || '%'
      or lower(coalesce(mp.profession, '')) like '%' || f.interest || '%'
    )
    and (
      f.travel = ''
      or lower(coalesce(mp.traveling_to, '')) like '%' || f.travel || '%'
      or lower(coalesce(mp.regions::text, '')) like '%' || f.travel || '%'
    )
    and (
      f.home_club = ''
      or lower(mp.primary_club) like '%' || f.home_club || '%'
    )
  order by mp.full_name asc
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;

revoke all on function public.ai_search_portal_members(jsonb, integer) from public;
grant execute on function public.ai_search_portal_members(jsonb, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Course rounds: hide blocked members' rounds
-- ---------------------------------------------------------------------------

drop policy if exists "Portal members can read course rounds" on public.member_course_rounds;
create policy "Portal members can read course rounds"
  on public.member_course_rounds
  for select
  to authenticated
  using (
    public.current_user_is_admin()
    or (
      public.current_user_has_portal_access()
      and (
        member_user_id = auth.uid()
        or not public.members_are_blocked(auth.uid(), member_user_id)
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 5. Likes / saves: hide engagement from/to blocked members
-- ---------------------------------------------------------------------------

drop policy if exists "Portal members can read feed post likes" on public.feed_post_likes;
create policy "Portal members can read feed post likes"
  on public.feed_post_likes
  for select
  to authenticated
  using (
    public.current_user_is_admin()
    or (
      public.current_user_has_portal_access()
      and (
        user_id = auth.uid()
        or not public.members_are_blocked(auth.uid(), user_id)
      )
      and exists (
        select 1
        from public.member_feed_posts fp
        where fp.id = feed_post_likes.post_id
          and fp.moderation_status = 'active'
          and fp.hidden_at is null
          and (
            fp.user_id = auth.uid()
            or not public.members_are_blocked(auth.uid(), fp.user_id)
          )
      )
    )
  );

drop policy if exists "Portal members can read feed post saves" on public.feed_post_saves;
create policy "Portal members can read feed post saves"
  on public.feed_post_saves
  for select
  to authenticated
  using (
    public.current_user_is_admin()
    or (
      public.current_user_has_portal_access()
      and user_id = auth.uid()
      and exists (
        select 1
        from public.member_feed_posts fp
        where fp.id = feed_post_saves.post_id
          and fp.moderation_status = 'active'
          and fp.hidden_at is null
          and (
            fp.user_id = auth.uid()
            or not public.members_are_blocked(auth.uid(), fp.user_id)
          )
      )
    )
  );

-- Comments already filtered in 080; keep create gated by portal access + not blocked author path via post visibility.

-- ---------------------------------------------------------------------------
-- 6. Suspended accounts: reinforce messaging helpers
-- ---------------------------------------------------------------------------
-- member_has_portal_access / current_user_has_portal_access already gate portal
-- features. Recreate can_send to fail closed if either party lacks portal access
-- (unchanged logic from 080, documented here for operators).

create or replace function public.can_send_direct_portal_message(
  p_sender_id uuid,
  p_receiver_id uuid
) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_sender_id is not null
    and p_receiver_id is not null
    and p_sender_id = auth.uid()
    and public.member_has_portal_access(p_sender_id)
    and public.member_has_portal_access(p_receiver_id)
    and public.can_exchange_direct_portal_messages(p_sender_id, p_receiver_id);
$$;

revoke all on function public.can_send_direct_portal_message(uuid, uuid) from public;
revoke all on function public.can_send_direct_portal_message(uuid, uuid) from anon;
grant execute on function public.can_send_direct_portal_message(uuid, uuid) to authenticated;

comment on table public.admin_email_allowlist is
  'Emails authorized for current_user_is_admin(). Keep VITE_ADMIN_EMAILS and ADMIN_NOTIFY_EMAILS in sync.';
