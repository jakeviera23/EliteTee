-- Migration 072: optional member profession on profiles.
-- Empty string = unset. Does not backfill from bio/application text.
-- Recreates fixed-column portal profile RPCs so profession is returned everywhere
-- those RPCs are used to read member profiles.

alter table public.member_profiles
  add column if not exists profession text not null default '';

comment on column public.member_profiles.profession is
  'Optional free-text business/profession. Empty string means unset; never show empty or placeholder values in UI.';

-- ---------------------------------------------------------------------------
-- Portal profile RPCs (drop/recreate for return shape)
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
    and public.current_user_has_portal_access();
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
    and public.current_user_has_portal_access();
$$;

revoke all on function public.get_portal_member_profile(uuid) from public;
revoke all on function public.get_portal_member_profiles_by_user_ids(uuid[]) from public;
grant execute on function public.get_portal_member_profile(uuid) to authenticated;
grant execute on function public.get_portal_member_profiles_by_user_ids(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Ask EliteTee member search RPC — include profession in returned profile shape
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
