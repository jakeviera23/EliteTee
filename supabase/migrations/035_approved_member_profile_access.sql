-- Approved portal members can read directory-safe profiles for other approved members.
-- Run in Supabase SQL Editor after migration 034.
-- Safe to rerun: uses CREATE OR REPLACE and DROP POLICY IF EXISTS.

-- ---------------------------------------------------------------------------
-- 1. Portal access helper (non-recursive, SECURITY DEFINER)
-- ---------------------------------------------------------------------------

create or replace function public.current_user_has_portal_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.member_profiles
    where user_id = auth.uid()
      and portal_access_enabled = true
  );
$$;

revoke all on function public.current_user_has_portal_access() from public;
grant execute on function public.current_user_has_portal_access() to authenticated;

-- ---------------------------------------------------------------------------
-- 2. member_profiles SELECT for approved members (no recursion)
-- ---------------------------------------------------------------------------

drop policy if exists "Portal members can read portal profiles" on public.member_profiles;

create policy "Portal members can read portal profiles"
  on public.member_profiles
  for select
  to authenticated
  using (
    portal_access_enabled = true
    and public.current_user_has_portal_access()
  );

-- ---------------------------------------------------------------------------
-- 3. Directory-safe profile RPCs (SECURITY DEFINER, no email)
-- ---------------------------------------------------------------------------

drop function if exists public.get_portal_member_profile(uuid);
drop function if exists public.get_portal_member_profiles_by_user_ids(uuid[]);

create or replace function public.get_portal_member_profile(p_user_id uuid)
returns table (
  id uuid,
  user_id uuid,
  full_name text,
  primary_club text,
  additional_clubs text[],
  based_in text,
  regions text[],
  industry text,
  golf_interests text[],
  business_interests text[],
  current_request text,
  traveling_to text,
  club_logo_url text,
  membership_status text,
  is_verified boolean,
  founding_member_number text,
  portal_access_enabled boolean,
  created_at timestamptz,
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
    mp.additional_clubs,
    mp.based_in,
    mp.regions,
    mp.industry,
    mp.golf_interests,
    mp.business_interests,
    mp.current_request,
    mp.traveling_to,
    mp.club_logo_url,
    mp.membership_status,
    mp.is_verified,
    mp.founding_member_number,
    mp.portal_access_enabled,
    mp.created_at,
    mp.updated_at
  from public.member_profiles mp
  where mp.user_id = p_user_id
    and mp.portal_access_enabled = true
    and public.current_user_has_portal_access();
$$;

create or replace function public.get_portal_member_profiles_by_user_ids(p_user_ids uuid[])
returns table (
  id uuid,
  user_id uuid,
  full_name text,
  primary_club text,
  additional_clubs text[],
  based_in text,
  regions text[],
  industry text,
  golf_interests text[],
  business_interests text[],
  current_request text,
  traveling_to text,
  club_logo_url text,
  membership_status text,
  is_verified boolean,
  founding_member_number text,
  portal_access_enabled boolean,
  created_at timestamptz,
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
    mp.additional_clubs,
    mp.based_in,
    mp.regions,
    mp.industry,
    mp.golf_interests,
    mp.business_interests,
    mp.current_request,
    mp.traveling_to,
    mp.club_logo_url,
    mp.membership_status,
    mp.is_verified,
    mp.founding_member_number,
    mp.portal_access_enabled,
    mp.created_at,
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
-- 4. member_course_rounds read policy — reuse helper (avoid nested profile subquery)
-- ---------------------------------------------------------------------------

drop policy if exists "Portal members can read course rounds" on public.member_course_rounds;

create policy "Portal members can read course rounds"
  on public.member_course_rounds
  for select
  to authenticated
  using (public.current_user_has_portal_access());
