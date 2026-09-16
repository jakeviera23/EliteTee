-- Migration 073: directory_visible for portal members.
-- Separates portal access from member-directory discoverability.
-- Default true preserves existing member visibility.
-- Hidden members (directory_visible = false) keep portal_access_enabled
-- for sign-in/use but are excluded from directory/search/RPC discovery
-- and from other members' profile reads (self + admin still allowed).

alter table public.member_profiles
  add column if not exists directory_visible boolean not null default true;

comment on column public.member_profiles.directory_visible is
  'When false, member remains portal-enabled but is excluded from Discover/directory/search and from other members'' profile reads. Self and admin access unchanged.';

-- ---------------------------------------------------------------------------
-- RLS: other portal members may only read directory-visible profiles.
-- Own-profile SELECT policies remain in place for directory_visible = false.
-- ---------------------------------------------------------------------------

drop policy if exists "Portal members can read portal profiles" on public.member_profiles;

create policy "Portal members can read portal profiles"
  on public.member_profiles
  for select
  to authenticated
  using (
    portal_access_enabled = true
    and directory_visible = true
    and public.current_user_has_portal_access()
  );

-- ---------------------------------------------------------------------------
-- Portal profile RPCs — same return shape as 072, plus directory gate
-- (self may still load own profile when directory_visible = false)
-- ---------------------------------------------------------------------------

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
      mp.directory_visible = true
      or mp.user_id = auth.uid()
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
      mp.directory_visible = true
      or mp.user_id = auth.uid()
    );
$$;

revoke all on function public.get_portal_member_profile(uuid) from public;
revoke all on function public.get_portal_member_profiles_by_user_ids(uuid[]) from public;
grant execute on function public.get_portal_member_profile(uuid) to authenticated;
grant execute on function public.get_portal_member_profiles_by_user_ids(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Ask EliteTee member search — exclude non-directory members
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
    and mp.directory_visible = true
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
-- Members who played a course — exclude non-directory members
-- ---------------------------------------------------------------------------

drop function if exists public.ai_members_by_course(uuid);

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
    and mp.directory_visible = true
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

revoke all on function public.ai_members_by_course(uuid) from public;
grant execute on function public.ai_members_by_course(uuid) to authenticated;
