-- Phase 2: reporting, blocking enforcement, admin moderation, safety alerts.
-- Additive on top of 079. Safe to rerun: IF NOT EXISTS / DROP POLICY IF EXISTS / CREATE OR REPLACE.
-- Does NOT apply itself to production; apply intentionally after review.

-- ---------------------------------------------------------------------------
-- 1. Soft-hide / moderation columns on UGC tables
-- ---------------------------------------------------------------------------

alter table public.member_feed_posts
  add column if not exists moderation_status text not null default 'active',
  add column if not exists hidden_at timestamptz,
  add column if not exists hidden_by uuid references public.users (id) on delete set null,
  add column if not exists hidden_reason text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'member_feed_posts_moderation_status_check'
  ) then
    alter table public.member_feed_posts
      add constraint member_feed_posts_moderation_status_check
      check (moderation_status in ('active', 'hidden', 'removed'));
  end if;
end $$;

alter table public.feed_post_comments
  add column if not exists moderation_status text not null default 'active',
  add column if not exists hidden_at timestamptz,
  add column if not exists hidden_by uuid references public.users (id) on delete set null,
  add column if not exists hidden_reason text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'feed_post_comments_moderation_status_check'
  ) then
    alter table public.feed_post_comments
      add constraint feed_post_comments_moderation_status_check
      check (moderation_status in ('active', 'hidden', 'removed'));
  end if;
end $$;

alter table public.private_messages
  add column if not exists moderation_hidden_at timestamptz,
  add column if not exists moderation_hidden_by uuid references public.users (id) on delete set null,
  add column if not exists moderation_hidden_reason text;

create index if not exists member_feed_posts_moderation_status_idx
  on public.member_feed_posts (moderation_status)
  where moderation_status <> 'active';

create index if not exists feed_post_comments_moderation_status_idx
  on public.feed_post_comments (moderation_status)
  where moderation_status <> 'active';

-- ---------------------------------------------------------------------------
-- 2. Moderation audit + admin safety alerts
-- ---------------------------------------------------------------------------

create table if not exists public.moderation_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.users (id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  target_user_id uuid references public.users (id) on delete set null,
  report_id uuid references public.content_reports (id) on delete set null,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint moderation_audit_events_action_check
    check (char_length(trim(action)) > 0 and char_length(action) <= 80),
  constraint moderation_audit_events_target_type_check
    check (char_length(trim(target_type)) > 0 and char_length(target_type) <= 64),
  constraint moderation_audit_events_notes_check
    check (notes is null or char_length(notes) <= 4000)
);

create index if not exists moderation_audit_events_created_idx
  on public.moderation_audit_events (created_at desc);

create index if not exists moderation_audit_events_report_idx
  on public.moderation_audit_events (report_id, created_at desc);

alter table public.moderation_audit_events enable row level security;

drop policy if exists "Admins can read moderation audit events"
  on public.moderation_audit_events;
create policy "Admins can read moderation audit events"
  on public.moderation_audit_events
  for select
  to authenticated
  using (public.current_user_is_admin());

revoke all on table public.moderation_audit_events from anon;
grant select on table public.moderation_audit_events to authenticated;

create table if not exists public.admin_safety_alerts (
  id uuid primary key default gen_random_uuid(),
  alert_type text not null,
  reference_id uuid not null,
  summary text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid references public.users (id) on delete set null,
  email_notified_at timestamptz,
  constraint admin_safety_alerts_type_check
    check (alert_type in ('content_report', 'member_block')),
  constraint admin_safety_alerts_summary_check
    check (char_length(trim(summary)) > 0 and char_length(summary) <= 500)
);

create index if not exists admin_safety_alerts_created_idx
  on public.admin_safety_alerts (created_at desc);

create index if not exists admin_safety_alerts_open_idx
  on public.admin_safety_alerts (created_at asc)
  where acknowledged_at is null;

alter table public.admin_safety_alerts enable row level security;

drop policy if exists "Admins can read safety alerts" on public.admin_safety_alerts;
create policy "Admins can read safety alerts"
  on public.admin_safety_alerts
  for select
  to authenticated
  using (public.current_user_is_admin());

drop policy if exists "Admins can update safety alerts" on public.admin_safety_alerts;
create policy "Admins can update safety alerts"
  on public.admin_safety_alerts
  for update
  to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

revoke all on table public.admin_safety_alerts from anon;
grant select, update on table public.admin_safety_alerts to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Block helpers
-- ---------------------------------------------------------------------------

create or replace function public.members_are_blocked(p_user_a uuid, p_user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select
    p_user_a is not null
    and p_user_b is not null
    and p_user_a <> p_user_b
    and exists (
      select 1
      from public.member_blocks mb
      where (
        mb.blocker_user_id = p_user_a
        and mb.blocked_user_id = p_user_b
      )
      or (
        mb.blocker_user_id = p_user_b
        and mb.blocked_user_id = p_user_a
      )
    );
$$;

revoke all on function public.members_are_blocked(uuid, uuid) from public;
revoke all on function public.members_are_blocked(uuid, uuid) from anon;
grant execute on function public.members_are_blocked(uuid, uuid) to authenticated;

create or replace function public.enqueue_admin_safety_alert(
  p_alert_type text,
  p_reference_id uuid,
  p_summary text,
  p_payload jsonb default '{}'::jsonb
)
returns public.admin_safety_alerts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.admin_safety_alerts;
begin
  insert into public.admin_safety_alerts (alert_type, reference_id, summary, payload)
  values (
    p_alert_type,
    p_reference_id,
    left(trim(p_summary), 500),
    coalesce(p_payload, '{}'::jsonb)
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.enqueue_admin_safety_alert(text, uuid, text, jsonb) from public;

create or replace function public.record_moderation_audit_event(
  p_action text,
  p_target_type text,
  p_target_id uuid,
  p_target_user_id uuid,
  p_report_id uuid,
  p_notes text,
  p_metadata jsonb default '{}'::jsonb
)
returns public.moderation_audit_events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.moderation_audit_events;
begin
  insert into public.moderation_audit_events (
    actor_user_id,
    action,
    target_type,
    target_id,
    target_user_id,
    report_id,
    notes,
    metadata
  )
  values (
    auth.uid(),
    left(trim(p_action), 80),
    left(trim(p_target_type), 64),
    p_target_id,
    p_target_user_id,
    p_report_id,
    nullif(left(trim(coalesce(p_notes, '')), 4000), ''),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.record_moderation_audit_event(text, text, uuid, uuid, uuid, text, jsonb)
  from public;

-- ---------------------------------------------------------------------------
-- 4. Messaging: blocks prevent exchange + hide moderated messages
-- ---------------------------------------------------------------------------

create or replace function public.can_exchange_direct_portal_messages(
  p_user_a uuid,
  p_user_b uuid
) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_user_a is not null
    and p_user_b is not null
    and p_user_a <> p_user_b
    and (
      auth.uid() is null
      or auth.uid() in (p_user_a, p_user_b)
    )
    and public.member_has_portal_access(p_user_a)
    and public.member_has_portal_access(p_user_b)
    and not public.members_are_blocked(p_user_a, p_user_b)
    and (
      public.members_have_accepted_introduction(p_user_a, p_user_b)
      or public.members_have_existing_direct_message_thread(p_user_a, p_user_b)
    );
$$;

create or replace function public.can_read_private_message(
  p_introduction_request_id uuid,
  p_sender_id uuid,
  p_receiver_id uuid,
  p_user_id uuid
) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_user_id is not null
    and p_user_id = auth.uid()
    and (p_sender_id = p_user_id or p_receiver_id = p_user_id)
    and not public.members_are_blocked(p_sender_id, p_receiver_id)
    and (
      (
        p_introduction_request_id is not null
        and public.is_accepted_introduction_participant(p_introduction_request_id, p_user_id)
      )
      or (
        p_introduction_request_id is null
        and public.can_exchange_direct_portal_messages(p_sender_id, p_receiver_id)
      )
    );
$$;

-- Hide moderated private messages from non-admins via policy overlay.
drop policy if exists "Participants can read private messages" on public.private_messages;
drop policy if exists "Members can read accessible private messages" on public.private_messages;

-- Keep existing insert/update policies; replace SELECT to include moderation gate.
do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'private_messages'
      and cmd = 'SELECT'
  loop
    execute format('drop policy if exists %I on public.private_messages', pol.policyname);
  end loop;
end $$;

create policy "Members can read accessible private messages"
  on public.private_messages
  for select
  to authenticated
  using (
    public.current_user_is_admin()
    or (
      public.can_read_private_message(
        introduction_request_id,
        sender_id,
        receiver_id,
        auth.uid()
      )
      and moderation_hidden_at is null
    )
  );

-- ---------------------------------------------------------------------------
-- 5. Feed + comments + profiles: block + moderation filters
-- ---------------------------------------------------------------------------

drop policy if exists "Portal members can read feed posts" on public.member_feed_posts;
create policy "Portal members can read feed posts"
  on public.member_feed_posts
  for select
  to authenticated
  using (
    public.current_user_is_admin()
    or (
      public.current_user_has_portal_access()
      and moderation_status = 'active'
      and hidden_at is null
      and (
        user_id = auth.uid()
        or not public.members_are_blocked(auth.uid(), user_id)
      )
    )
  );

drop policy if exists "Portal members can read feed post comments" on public.feed_post_comments;
create policy "Portal members can read feed post comments"
  on public.feed_post_comments
  for select
  to authenticated
  using (
    public.current_user_is_admin()
    or (
      public.current_user_has_portal_access()
      and moderation_status = 'active'
      and hidden_at is null
      and (
        user_id = auth.uid()
        or not public.members_are_blocked(auth.uid(), user_id)
      )
      and exists (
        select 1
        from public.member_feed_posts fp
        where fp.id = feed_post_comments.post_id
          and (
            public.current_user_is_admin()
            or (
              fp.moderation_status = 'active'
              and fp.hidden_at is null
              and (
                fp.user_id = auth.uid()
                or not public.members_are_blocked(auth.uid(), fp.user_id)
              )
            )
          )
      )
    )
  );

drop policy if exists "Portal members can read portal profiles" on public.member_profiles;
create policy "Portal members can read portal profiles"
  on public.member_profiles
  for select
  to authenticated
  using (
    public.current_user_is_admin()
    or (
      portal_access_enabled = true
      and public.current_user_has_portal_access()
      and (
        user_id = auth.uid()
        or user_id is null
        or not public.members_are_blocked(auth.uid(), user_id)
      )
    )
  );

drop function if exists public.fetch_member_feed_page(timestamptz, uuid, integer);

create function public.fetch_member_feed_page(
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null,
  p_limit integer default 20
)
returns table (
  id uuid,
  user_id uuid,
  member_profile_id uuid,
  member_course_round_id uuid,
  content text,
  post_type text,
  created_at timestamptz,
  updated_at timestamptz,
  full_name text,
  primary_club text,
  based_in text,
  club_logo_url text,
  is_verified boolean,
  profile_user_id uuid,
  founding_member_number text,
  industry text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    fp.id,
    fp.user_id,
    fp.member_profile_id,
    fp.member_course_round_id,
    fp.content,
    fp.post_type,
    fp.created_at,
    fp.updated_at,
    mp.full_name,
    mp.primary_club,
    mp.based_in,
    mp.club_logo_url,
    coalesce(mp.is_verified, false) as is_verified,
    mp.user_id as profile_user_id,
    mp.founding_member_number,
    mp.industry
  from public.member_feed_posts fp
  left join public.member_profiles mp
    on mp.id = fp.member_profile_id
  where public.current_user_has_portal_access()
    and fp.moderation_status = 'active'
    and fp.hidden_at is null
    and (
      fp.user_id = auth.uid()
      or not public.members_are_blocked(auth.uid(), fp.user_id)
    )
    and (
      p_cursor_created_at is null
      or p_cursor_id is null
      or (fp.created_at, fp.id) < (p_cursor_created_at, p_cursor_id)
    )
  order by fp.created_at desc, fp.id desc
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;

revoke all on function public.fetch_member_feed_page(timestamptz, uuid, integer) from public;
grant execute on function public.fetch_member_feed_page(timestamptz, uuid, integer) to authenticated;

drop function if exists public.get_portal_member_profiles_by_user_ids(uuid[]);
drop function if exists public.get_portal_member_profile(uuid);

create function public.get_portal_member_profile(p_user_id uuid)
returns table (
  id uuid,
  user_id uuid,
  full_name text,
  primary_club text,
  additional_clubs text,
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
  membership_status text,
  is_verified boolean,
  founding_member_number text,
  portal_access_enabled boolean,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    mp.id,
    mp.user_id,
    mp.full_name,
    mp.primary_club,
    coalesce(mp.additional_clubs::text, ''),
    mp.based_in,
    coalesce(mp.regions::text, ''),
    mp.industry,
    coalesce(mp.profession, ''),
    coalesce(mp.golf_interests::text, ''),
    coalesce(mp.business_interests::text, ''),
    mp.current_request,
    coalesce(mp.traveling_to, ''),
    mp.club_logo_url,
    mp.cover_photo_url,
    mp.membership_status,
    mp.is_verified,
    mp.founding_member_number,
    mp.portal_access_enabled,
    mp.updated_at
  from public.member_profiles mp
  where mp.user_id = p_user_id
    and mp.portal_access_enabled = true
    and public.current_user_has_portal_access()
    and (
      public.current_user_is_admin()
      or mp.user_id = auth.uid()
      or not public.members_are_blocked(auth.uid(), mp.user_id)
    );
$$;

create function public.get_portal_member_profiles_by_user_ids(p_user_ids uuid[])
returns table (
  id uuid,
  user_id uuid,
  full_name text,
  primary_club text,
  additional_clubs text,
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
  membership_status text,
  is_verified boolean,
  founding_member_number text,
  portal_access_enabled boolean,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    mp.id,
    mp.user_id,
    mp.full_name,
    mp.primary_club,
    coalesce(mp.additional_clubs::text, ''),
    mp.based_in,
    coalesce(mp.regions::text, ''),
    mp.industry,
    coalesce(mp.profession, ''),
    coalesce(mp.golf_interests::text, ''),
    coalesce(mp.business_interests::text, ''),
    mp.current_request,
    coalesce(mp.traveling_to, ''),
    mp.club_logo_url,
    mp.cover_photo_url,
    mp.membership_status,
    mp.is_verified,
    mp.founding_member_number,
    mp.portal_access_enabled,
    mp.updated_at
  from public.member_profiles mp
  where mp.user_id = any(p_user_ids)
    and mp.portal_access_enabled = true
    and public.current_user_has_portal_access()
    and (
      public.current_user_is_admin()
      or mp.user_id = auth.uid()
      or not public.members_are_blocked(auth.uid(), mp.user_id)
    );
$$;

revoke all on function public.get_portal_member_profile(uuid) from public;
revoke all on function public.get_portal_member_profiles_by_user_ids(uuid[]) from public;
grant execute on function public.get_portal_member_profile(uuid) to authenticated;
grant execute on function public.get_portal_member_profiles_by_user_ids(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Member report / block RPCs
-- ---------------------------------------------------------------------------

create or replace function public.submit_content_report(
  p_target_type text,
  p_target_id uuid,
  p_reason text,
  p_details text default null
)
returns public.content_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reporter uuid := auth.uid();
  v_target_type text := lower(trim(coalesce(p_target_type, '')));
  v_reason text := lower(trim(coalesce(p_reason, '')));
  v_details text := nullif(left(trim(coalesce(p_details, '')), 2000), '');
  v_target_user_id uuid;
  v_row public.content_reports;
  v_alert public.admin_safety_alerts;
begin
  if v_reporter is null then
    raise exception 'Authentication required.';
  end if;

  if not public.current_user_has_portal_access() then
    raise exception 'Portal access is required to submit a report.';
  end if;

  if v_target_type not in ('feed_post', 'feed_comment', 'private_message', 'member_profile') then
    raise exception 'Invalid report target type.';
  end if;

  if v_reason not in ('harassment', 'inappropriate_content', 'spam', 'other') then
    raise exception 'Invalid report reason.';
  end if;

  if p_target_id is null then
    raise exception 'A report target is required.';
  end if;

  if v_target_type = 'feed_post' then
    select fp.user_id into v_target_user_id
    from public.member_feed_posts fp
    where fp.id = p_target_id
      and fp.moderation_status = 'active'
      and fp.hidden_at is null;

    if v_target_user_id is null then
      raise exception 'That post could not be found.';
    end if;

    if v_target_user_id = v_reporter then
      raise exception 'You cannot report your own post.';
    end if;

    if public.members_are_blocked(v_reporter, v_target_user_id) then
      raise exception 'You cannot report content from a blocked member.';
    end if;

  elsif v_target_type = 'feed_comment' then
    select fc.user_id into v_target_user_id
    from public.feed_post_comments fc
    join public.member_feed_posts fp on fp.id = fc.post_id
    where fc.id = p_target_id
      and fc.moderation_status = 'active'
      and fc.hidden_at is null
      and fp.moderation_status = 'active'
      and fp.hidden_at is null
      and (
        fp.user_id = v_reporter
        or fc.user_id = v_reporter
        or not public.members_are_blocked(v_reporter, fp.user_id)
      );

    if v_target_user_id is null then
      raise exception 'That comment could not be found.';
    end if;

    if v_target_user_id = v_reporter then
      raise exception 'You cannot report your own comment.';
    end if;

  elsif v_target_type = 'private_message' then
    select
      case
        when pm.sender_id = v_reporter then pm.receiver_id
        else pm.sender_id
      end
    into v_target_user_id
    from public.private_messages pm
    where pm.id = p_target_id
      and pm.moderation_hidden_at is null
      and (pm.sender_id = v_reporter or pm.receiver_id = v_reporter);

    if v_target_user_id is null then
      raise exception 'That message could not be found.';
    end if;

  elsif v_target_type = 'member_profile' then
    select mp.user_id into v_target_user_id
    from public.member_profiles mp
    where mp.user_id = p_target_id
      and mp.portal_access_enabled = true;

    if v_target_user_id is null then
      raise exception 'That member profile could not be found.';
    end if;

    if v_target_user_id = v_reporter then
      raise exception 'You cannot report your own profile.';
    end if;
  end if;

  if exists (
    select 1
    from public.content_reports cr
    where cr.reporter_user_id = v_reporter
      and cr.target_type = v_target_type
      and cr.target_id = p_target_id
      and cr.status in ('open', 'reviewing')
  ) then
    raise exception 'You already have an open report for this content.';
  end if;

  insert into public.content_reports (
    reporter_user_id,
    target_type,
    target_id,
    target_user_id,
    reason,
    details,
    status
  )
  values (
    v_reporter,
    v_target_type,
    p_target_id,
    v_target_user_id,
    v_reason,
    v_details,
    'open'
  )
  returning * into v_row;

  v_alert := public.enqueue_admin_safety_alert(
    'content_report',
    v_row.id,
    format('New content report (%s) on %s', v_reason, v_target_type),
    jsonb_build_object(
      'report_id', v_row.id,
      'target_type', v_target_type,
      'target_id', p_target_id,
      'target_user_id', v_target_user_id,
      'reason', v_reason
    )
  );

  perform public.record_moderation_audit_event(
    'report_submitted',
    v_target_type,
    p_target_id,
    v_target_user_id,
    v_row.id,
    null,
    jsonb_build_object('alert_id', v_alert.id, 'reason', v_reason)
  );

  return v_row;
end;
$$;

revoke all on function public.submit_content_report(text, uuid, text, text) from public;
grant execute on function public.submit_content_report(text, uuid, text, text) to authenticated;

create or replace function public.block_member(p_blocked_user_id uuid)
returns public.member_blocks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_blocker uuid := auth.uid();
  v_row public.member_blocks;
  v_alert public.admin_safety_alerts;
  v_name text;
begin
  if v_blocker is null then
    raise exception 'Authentication required.';
  end if;

  if not public.current_user_has_portal_access() then
    raise exception 'Portal access is required to block a member.';
  end if;

  if p_blocked_user_id is null or p_blocked_user_id = v_blocker then
    raise exception 'You cannot block yourself.';
  end if;

  if not exists (
    select 1
    from public.member_profiles mp
    where mp.user_id = p_blocked_user_id
      and mp.portal_access_enabled = true
  ) then
    raise exception 'That member could not be found.';
  end if;

  insert into public.member_blocks (blocker_user_id, blocked_user_id)
  values (v_blocker, p_blocked_user_id)
  on conflict (blocker_user_id, blocked_user_id) do update
    set blocker_user_id = excluded.blocker_user_id
  returning * into v_row;

  select mp.full_name into v_name
  from public.member_profiles mp
  where mp.user_id = p_blocked_user_id;

  v_alert := public.enqueue_admin_safety_alert(
    'member_block',
    v_row.id,
    format('Member block recorded%s', case when v_name is null then '' else ' (' || v_name || ')' end),
    jsonb_build_object(
      'block_id', v_row.id,
      'blocker_user_id', v_blocker,
      'blocked_user_id', p_blocked_user_id
    )
  );

  perform public.record_moderation_audit_event(
    'member_blocked',
    'member_profile',
    p_blocked_user_id,
    p_blocked_user_id,
    null,
    null,
    jsonb_build_object('alert_id', v_alert.id, 'block_id', v_row.id)
  );

  return v_row;
end;
$$;

revoke all on function public.block_member(uuid) from public;
grant execute on function public.block_member(uuid) to authenticated;

create or replace function public.unblock_member(p_blocked_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_blocker uuid := auth.uid();
  v_deleted integer := 0;
begin
  if v_blocker is null then
    raise exception 'Authentication required.';
  end if;

  delete from public.member_blocks
  where blocker_user_id = v_blocker
    and blocked_user_id = p_blocked_user_id;

  get diagnostics v_deleted = row_count;

  if v_deleted > 0 then
    perform public.record_moderation_audit_event(
      'member_unblocked',
      'member_profile',
      p_blocked_user_id,
      p_blocked_user_id,
      null,
      null,
      '{}'::jsonb
    );
  end if;

  return v_deleted > 0;
end;
$$;

revoke all on function public.unblock_member(uuid) from public;
grant execute on function public.unblock_member(uuid) to authenticated;

create or replace function public.list_my_blocked_members()
returns table (
  block_id uuid,
  blocked_user_id uuid,
  full_name text,
  primary_club text,
  based_in text,
  club_logo_url text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    mb.id as block_id,
    mb.blocked_user_id,
    mp.full_name,
    mp.primary_club,
    mp.based_in,
    mp.club_logo_url,
    mb.created_at
  from public.member_blocks mb
  left join public.member_profiles mp
    on mp.user_id = mb.blocked_user_id
  where mb.blocker_user_id = auth.uid()
  order by mb.created_at desc;
$$;

revoke all on function public.list_my_blocked_members() from public;
grant execute on function public.list_my_blocked_members() to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Admin moderation RPCs
-- ---------------------------------------------------------------------------

create or replace function public.admin_list_content_reports(
  p_status text default null,
  p_limit integer default 100
)
returns setof public.content_reports
language sql
stable
security definer
set search_path = public
as $$
  select cr.*
  from public.content_reports cr
  where public.current_user_is_admin()
    and (
      p_status is null
      or nullif(trim(p_status), '') is null
      or cr.status = lower(trim(p_status))
    )
  order by cr.created_at asc
  limit greatest(1, least(coalesce(p_limit, 100), 500));
$$;

revoke all on function public.admin_list_content_reports(text, integer) from public;
grant execute on function public.admin_list_content_reports(text, integer) to authenticated;

create or replace function public.admin_update_content_report(
  p_report_id uuid,
  p_status text,
  p_resolution_notes text default null
)
returns public.content_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text := lower(trim(coalesce(p_status, '')));
  v_row public.content_reports;
begin
  if not public.current_user_is_admin() then
    raise exception 'Admin access required.';
  end if;

  if v_status not in ('open', 'reviewing', 'resolved', 'dismissed') then
    raise exception 'Invalid report status.';
  end if;

  update public.content_reports
  set
    status = v_status,
    resolution_notes = nullif(left(trim(coalesce(p_resolution_notes, '')), 4000), ''),
    reviewed_at = case
      when v_status in ('resolved', 'dismissed') then now()
      else reviewed_at
    end,
    reviewed_by = case
      when v_status in ('resolved', 'dismissed') then auth.uid()
      else reviewed_by
    end
  where id = p_report_id
  returning * into v_row;

  if not found then
    raise exception 'Report not found.';
  end if;

  perform public.record_moderation_audit_event(
    'report_status_updated',
    v_row.target_type,
    v_row.target_id,
    v_row.target_user_id,
    v_row.id,
    v_row.resolution_notes,
    jsonb_build_object('status', v_status)
  );

  return v_row;
end;
$$;

revoke all on function public.admin_update_content_report(uuid, text, text) from public;
grant execute on function public.admin_update_content_report(uuid, text, text) to authenticated;

create or replace function public.admin_hide_reported_content(
  p_target_type text,
  p_target_id uuid,
  p_reason text default null,
  p_report_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type text := lower(trim(coalesce(p_target_type, '')));
  v_reason text := nullif(left(trim(coalesce(p_reason, 'Hidden by moderator')), 500), '');
  v_target_user uuid;
  v_updated integer := 0;
begin
  if not public.current_user_is_admin() then
    raise exception 'Admin access required.';
  end if;

  if v_type = 'feed_post' then
    update public.member_feed_posts
    set
      moderation_status = 'hidden',
      hidden_at = now(),
      hidden_by = auth.uid(),
      hidden_reason = v_reason
    where id = p_target_id
      and moderation_status = 'active'
    returning user_id into v_target_user;
    get diagnostics v_updated = row_count;

  elsif v_type = 'feed_comment' then
    update public.feed_post_comments
    set
      moderation_status = 'hidden',
      hidden_at = now(),
      hidden_by = auth.uid(),
      hidden_reason = v_reason
    where id = p_target_id
      and moderation_status = 'active'
    returning user_id into v_target_user;
    get diagnostics v_updated = row_count;

  elsif v_type = 'private_message' then
    update public.private_messages
    set
      moderation_hidden_at = now(),
      moderation_hidden_by = auth.uid(),
      moderation_hidden_reason = v_reason
    where id = p_target_id
      and moderation_hidden_at is null
    returning
      case when sender_id = auth.uid() then receiver_id else sender_id end
    into v_target_user;
    get diagnostics v_updated = row_count;

  else
    raise exception 'Unsupported content type for hiding.';
  end if;

  if v_updated = 0 then
    raise exception 'Content could not be hidden.';
  end if;

  perform public.record_moderation_audit_event(
    'content_hidden',
    v_type,
    p_target_id,
    v_target_user,
    p_report_id,
    v_reason,
    '{}'::jsonb
  );

  return true;
end;
$$;

revoke all on function public.admin_hide_reported_content(text, uuid, text, uuid) from public;
grant execute on function public.admin_hide_reported_content(text, uuid, text, uuid) to authenticated;

create or replace function public.admin_set_member_portal_access(
  p_user_id uuid,
  p_enabled boolean,
  p_reason text default null,
  p_report_id uuid default null
)
returns public.member_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.member_profiles;
  v_reason text := nullif(left(trim(coalesce(p_reason, '')), 500), '');
begin
  if not public.current_user_is_admin() then
    raise exception 'Admin access required.';
  end if;

  if p_user_id is null then
    raise exception 'Member user id is required.';
  end if;

  if p_user_id = auth.uid() and p_enabled is false then
    raise exception 'Admins cannot suspend their own account from this tool.';
  end if;

  update public.member_profiles
  set
    portal_access_enabled = coalesce(p_enabled, false),
    updated_at = now()
  where user_id = p_user_id
  returning * into v_row;

  if not found then
    raise exception 'Member profile not found.';
  end if;

  perform public.record_moderation_audit_event(
    case when coalesce(p_enabled, false) then 'member_unsuspended' else 'member_suspended' end,
    'member_profile',
    p_user_id,
    p_user_id,
    p_report_id,
    v_reason,
    jsonb_build_object('portal_access_enabled', coalesce(p_enabled, false))
  );

  return v_row;
end;
$$;

revoke all on function public.admin_set_member_portal_access(uuid, boolean, text, uuid) from public;
grant execute on function public.admin_set_member_portal_access(uuid, boolean, text, uuid)
  to authenticated;

create or replace function public.admin_list_recent_member_blocks(p_limit integer default 50)
returns table (
  id uuid,
  blocker_user_id uuid,
  blocked_user_id uuid,
  blocker_name text,
  blocked_name text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    mb.id,
    mb.blocker_user_id,
    mb.blocked_user_id,
    blocker.full_name as blocker_name,
    blocked.full_name as blocked_name,
    mb.created_at
  from public.member_blocks mb
  left join public.member_profiles blocker on blocker.user_id = mb.blocker_user_id
  left join public.member_profiles blocked on blocked.user_id = mb.blocked_user_id
  where public.current_user_is_admin()
  order by mb.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 200));
$$;

revoke all on function public.admin_list_recent_member_blocks(integer) from public;
grant execute on function public.admin_list_recent_member_blocks(integer) to authenticated;

create or replace function public.admin_acknowledge_safety_alert(p_alert_id uuid)
returns public.admin_safety_alerts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.admin_safety_alerts;
begin
  if not public.current_user_is_admin() then
    raise exception 'Admin access required.';
  end if;

  update public.admin_safety_alerts
  set
    acknowledged_at = now(),
    acknowledged_by = auth.uid()
  where id = p_alert_id
  returning * into v_row;

  if not found then
    raise exception 'Alert not found.';
  end if;

  return v_row;
end;
$$;

revoke all on function public.admin_acknowledge_safety_alert(uuid) from public;
grant execute on function public.admin_acknowledge_safety_alert(uuid) to authenticated;

create or replace function public.mark_admin_safety_alert_emailed(p_alert_id uuid)
returns public.admin_safety_alerts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.admin_safety_alerts;
begin
  -- Invoked by notify-admin-safety edge function with service role, or by admins.
  if auth.uid() is not null and not public.current_user_is_admin() then
    raise exception 'Admin access required.';
  end if;

  update public.admin_safety_alerts
  set email_notified_at = coalesce(email_notified_at, now())
  where id = p_alert_id
  returning * into v_row;

  if not found then
    raise exception 'Alert not found.';
  end if;

  return v_row;
end;
$$;

revoke all on function public.mark_admin_safety_alert_emailed(uuid) from public;
grant execute on function public.mark_admin_safety_alert_emailed(uuid) to authenticated;
grant execute on function public.mark_admin_safety_alert_emailed(uuid) to service_role;
