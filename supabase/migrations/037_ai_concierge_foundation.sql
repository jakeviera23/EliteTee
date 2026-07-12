-- EliteTee AI concierge foundation (Phase 1).
-- Run in Supabase SQL Editor after migration 036.
-- Safe to rerun: uses IF NOT EXISTS / DROP IF EXISTS where practical.
--
-- Does NOT store full prompts. Directory-safe retrieval RPCs only.
-- Requires current_user_has_portal_access() from migration 035.
-- Optional: cover_photo_url from migration 036 (added here if missing).

alter table public.member_profiles
  add column if not exists cover_photo_url text;

-- ---------------------------------------------------------------------------
-- 0. Admin helper (matches membership_applications admin email pattern)
-- ---------------------------------------------------------------------------

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) in (
    lower('jakeviera23@gmail.com')
  );
$$;

revoke all on function public.current_user_is_admin() from public;
grant execute on function public.current_user_is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- 1. ai_settings (singleton)
-- ---------------------------------------------------------------------------

create table if not exists public.ai_settings (
  id smallint primary key default 1 check (id = 1),
  enabled boolean not null default true,
  enable_find_members boolean not null default true,
  enable_find_courses boolean not null default true,
  enable_recommend_introductions boolean not null default true,
  daily_member_limit integer not null default 25 check (daily_member_limit between 1 and 500),
  updated_at timestamptz not null default now()
);

insert into public.ai_settings (id)
values (1)
on conflict (id) do nothing;

alter table public.ai_settings enable row level security;

drop policy if exists "Portal members can read ai settings flags" on public.ai_settings;
drop policy if exists "Admins can update ai settings" on public.ai_settings;

create policy "Portal members can read ai settings flags"
  on public.ai_settings
  for select
  to authenticated
  using (public.current_user_has_portal_access() or public.current_user_is_admin());

create policy "Admins can update ai settings"
  on public.ai_settings
  for update
  to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

grant select on public.ai_settings to authenticated;
grant update on public.ai_settings to authenticated;

-- ---------------------------------------------------------------------------
-- 2. ai_queries (metadata only — no full prompts)
-- ---------------------------------------------------------------------------

create table if not exists public.ai_queries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  intent text not null,
  status text not null check (status in ('ok', 'insufficient_data', 'unsupported', 'rate_limited', 'disabled', 'error')),
  latency_ms integer,
  model text,
  input_tokens integer,
  output_tokens integer,
  error_code text,
  created_at timestamptz not null default now()
);

create index if not exists ai_queries_user_id_created_at_idx
  on public.ai_queries (user_id, created_at desc);

create index if not exists ai_queries_created_at_idx
  on public.ai_queries (created_at desc);

create index if not exists ai_queries_intent_idx
  on public.ai_queries (intent, created_at desc);

alter table public.ai_queries enable row level security;

drop policy if exists "Members can read own ai queries" on public.ai_queries;
drop policy if exists "Members can insert own ai queries" on public.ai_queries;
drop policy if exists "Admins can read ai query aggregates" on public.ai_queries;

create policy "Members can read own ai queries"
  on public.ai_queries
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Members can insert own ai queries"
  on public.ai_queries
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Admins can read ai query aggregates"
  on public.ai_queries
  for select
  to authenticated
  using (public.current_user_is_admin());

grant select, insert on public.ai_queries to authenticated;

-- ---------------------------------------------------------------------------
-- 3. member_match_suggestions
-- ---------------------------------------------------------------------------

create table if not exists public.member_match_suggestions (
  id uuid primary key default gen_random_uuid(),
  requestor_user_id uuid not null references auth.users (id) on delete cascade,
  suggested_user_id uuid not null references auth.users (id) on delete cascade,
  ai_query_id uuid references public.ai_queries (id) on delete set null,
  score numeric not null check (score >= 0 and score <= 100),
  signals jsonb not null default '[]'::jsonb,
  dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint member_match_suggestions_distinct_users check (requestor_user_id <> suggested_user_id)
);

create index if not exists member_match_suggestions_requestor_idx
  on public.member_match_suggestions (requestor_user_id, created_at desc);

alter table public.member_match_suggestions enable row level security;

drop policy if exists "Members can read own match suggestions" on public.member_match_suggestions;
drop policy if exists "Members can insert own match suggestions" on public.member_match_suggestions;
drop policy if exists "Members can update own match suggestions" on public.member_match_suggestions;
drop policy if exists "Admins can read match suggestions" on public.member_match_suggestions;

create policy "Members can read own match suggestions"
  on public.member_match_suggestions
  for select
  to authenticated
  using (requestor_user_id = auth.uid());

create policy "Members can insert own match suggestions"
  on public.member_match_suggestions
  for insert
  to authenticated
  with check (requestor_user_id = auth.uid());

create policy "Members can update own match suggestions"
  on public.member_match_suggestions
  for update
  to authenticated
  using (requestor_user_id = auth.uid())
  with check (requestor_user_id = auth.uid());

create policy "Admins can read match suggestions"
  on public.member_match_suggestions
  for select
  to authenticated
  using (public.current_user_is_admin());

grant select, insert, update on public.member_match_suggestions to authenticated;

-- ---------------------------------------------------------------------------
-- 4. ai_feedback
-- ---------------------------------------------------------------------------

create table if not exists public.ai_feedback (
  id uuid primary key default gen_random_uuid(),
  query_id uuid not null references public.ai_queries (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  constraint ai_feedback_one_per_query unique (query_id, user_id)
);

alter table public.ai_feedback enable row level security;

drop policy if exists "Members can insert own ai feedback" on public.ai_feedback;
drop policy if exists "Members can read own ai feedback" on public.ai_feedback;
drop policy if exists "Admins can read ai feedback" on public.ai_feedback;

create policy "Members can insert own ai feedback"
  on public.ai_feedback
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.ai_queries q
      where q.id = query_id
        and q.user_id = auth.uid()
    )
  );

create policy "Members can read own ai feedback"
  on public.ai_feedback
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Admins can read ai feedback"
  on public.ai_feedback
  for select
  to authenticated
  using (public.current_user_is_admin());

grant select, insert on public.ai_feedback to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Retrieval RPCs (directory-safe, SECURITY DEFINER)
-- ---------------------------------------------------------------------------

drop function if exists public.ai_search_portal_members(jsonb, integer);
drop function if exists public.ai_search_golf_courses(text, integer);
drop function if exists public.ai_members_by_course(uuid);
drop function if exists public.ai_member_round_summary(uuid[]);

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
      f.q = ''
      or lower(mp.full_name) like '%' || f.q || '%'
      or lower(mp.based_in) like '%' || f.q || '%'
      or lower(mp.primary_club) like '%' || f.q || '%'
      or lower(coalesce(mp.traveling_to, '')) like '%' || f.q || '%'
      or lower(coalesce(mp.industry, '')) like '%' || f.q || '%'
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

create function public.ai_search_golf_courses(
  p_query text default '',
  p_limit integer default 20
)
returns table (
  id uuid,
  name text,
  slug text,
  city text,
  region text,
  country text,
  course_type text,
  access_type text,
  description text,
  round_count bigint,
  member_count bigint,
  recommend_pct numeric,
  avg_rating numeric,
  latest_activity_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id,
    s.name,
    s.slug,
    s.city,
    s.region,
    s.country,
    s.course_type,
    s.access_type,
    s.description,
    s.round_count,
    s.member_count,
    s.recommend_pct,
    s.avg_rating,
    s.latest_activity_at
  from public.search_golf_courses(
    coalesce(p_query, ''),
    greatest(1, least(coalesce(p_limit, 20), 50)),
    0
  ) s
  where public.current_user_has_portal_access()
  order by s.avg_rating desc nulls last, s.round_count desc nulls last, s.name asc;
$$;

create function public.ai_members_by_course(p_course_id uuid)
returns table (
  user_id uuid,
  full_name text,
  primary_club text,
  based_in text,
  golf_interests text,
  traveling_to text,
  round_count bigint,
  latest_played_on date,
  avg_course_rating numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    mp.user_id,
    mp.full_name,
    mp.primary_club,
    mp.based_in,
    coalesce(mp.golf_interests::text, '') as golf_interests,
    coalesce(mp.traveling_to, '') as traveling_to,
    count(*)::bigint as round_count,
    max(mcr.played_on) as latest_played_on,
    round(avg(mcr.course_rating::numeric), 1) as avg_course_rating
  from public.member_course_rounds mcr
  join public.member_profiles mp
    on mp.user_id = mcr.member_user_id
  where mcr.golf_course_id = p_course_id
    and mp.portal_access_enabled = true
    and mp.user_id is not null
    and mp.user_id <> auth.uid()
    and public.current_user_has_portal_access()
  group by
    mp.user_id,
    mp.full_name,
    mp.primary_club,
    mp.based_in,
    mp.golf_interests,
    mp.traveling_to
  order by latest_played_on desc nulls last, mp.full_name asc
  limit 50;
$$;

create function public.ai_member_round_summary(p_user_ids uuid[])
returns table (
  user_id uuid,
  golf_course_id uuid,
  course_name text,
  course_slug text,
  location text,
  played_on date,
  course_rating integer,
  would_play_again boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    mcr.member_user_id as user_id,
    mcr.golf_course_id,
    coalesce(gc.name, mcr.course_name) as course_name,
    gc.slug as course_slug,
    coalesce(
      nullif(trim(concat_ws(', ', gc.city, gc.region, gc.country)), ''),
      mcr.location
    ) as location,
    mcr.played_on,
    mcr.course_rating,
    mcr.would_play_again
  from public.member_course_rounds mcr
  left join public.golf_courses gc on gc.id = mcr.golf_course_id
  where mcr.member_user_id = any(p_user_ids)
    and public.current_user_has_portal_access()
  order by mcr.played_on desc nulls last
  limit 200;
$$;

revoke all on function public.ai_search_portal_members(jsonb, integer) from public;
revoke all on function public.ai_search_golf_courses(text, integer) from public;
revoke all on function public.ai_members_by_course(uuid) from public;
revoke all on function public.ai_member_round_summary(uuid[]) from public;

grant execute on function public.ai_search_portal_members(jsonb, integer) to authenticated;
grant execute on function public.ai_search_golf_courses(text, integer) to authenticated;
grant execute on function public.ai_members_by_course(uuid) to authenticated;
grant execute on function public.ai_member_round_summary(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Admin dashboard RPC (aggregates only)
-- ---------------------------------------------------------------------------

drop function if exists public.ai_admin_get_ops_dashboard();

create function public.ai_admin_get_ops_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.current_user_is_admin() then
    raise exception 'Admin access required';
  end if;

  select jsonb_build_object(
    'settings', (
      select jsonb_build_object(
        'enabled', s.enabled,
        'enable_find_members', s.enable_find_members,
        'enable_find_courses', s.enable_find_courses,
        'enable_recommend_introductions', s.enable_recommend_introductions,
        'daily_member_limit', s.daily_member_limit,
        'updated_at', s.updated_at
      )
      from public.ai_settings s
      where s.id = 1
    ),
    'queries_today', (
      select count(*)::integer
      from public.ai_queries q
      where q.created_at >= date_trunc('day', now())
    ),
    'queries_7d', (
      select count(*)::integer
      from public.ai_queries q
      where q.created_at >= now() - interval '7 days'
    ),
    'failures_7d', (
      select count(*)::integer
      from public.ai_queries q
      where q.created_at >= now() - interval '7 days'
        and q.status in ('error', 'unsupported')
    ),
    'intent_breakdown_7d', coalesce((
      select jsonb_object_agg(intent, cnt)
      from (
        select q.intent, count(*)::integer as cnt
        from public.ai_queries q
        where q.created_at >= now() - interval '7 days'
        group by q.intent
      ) t
    ), '{}'::jsonb),
    'token_usage_7d', jsonb_build_object(
      'input_tokens', coalesce((
        select sum(coalesce(input_tokens, 0))::bigint from public.ai_queries
        where created_at >= now() - interval '7 days'
      ), 0),
      'output_tokens', coalesce((
        select sum(coalesce(output_tokens, 0))::bigint from public.ai_queries
        where created_at >= now() - interval '7 days'
      ), 0)
    ),
    'recent_error_codes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'error_code', error_code,
        'created_at', created_at
      ) order by created_at desc)
      from (
        select q.error_code, q.created_at
        from public.ai_queries q
        where q.error_code is not null
          and q.created_at >= now() - interval '7 days'
        order by q.created_at desc
        limit 20
      ) e
    ), '[]'::jsonb),
    'feedback_average_7d', (
      select round(avg(f.rating)::numeric, 2)
      from public.ai_feedback f
      where f.created_at >= now() - interval '7 days'
    ),
    'feedback_count_7d', (
      select count(*)::integer
      from public.ai_feedback f
      where f.created_at >= now() - interval '7 days'
    )
  )
  into result;

  return result;
end;
$$;

revoke all on function public.ai_admin_get_ops_dashboard() from public;
grant execute on function public.ai_admin_get_ops_dashboard() to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Daily usage helper for rate limiting
-- ---------------------------------------------------------------------------

drop function if exists public.ai_member_queries_today_count();

create function public.ai_member_queries_today_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.ai_queries q
  where q.user_id = auth.uid()
    and q.created_at >= date_trunc('day', timezone('utc', now()));
$$;

revoke all on function public.ai_member_queries_today_count() from public;
grant execute on function public.ai_member_queries_today_count() to authenticated;
