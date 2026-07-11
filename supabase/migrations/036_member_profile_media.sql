-- Per-member profile cover and avatar media (Supabase Storage + member_profiles.cover_photo_url).
-- Run in Supabase SQL Editor after migration 035.
-- Safe to rerun: idempotent bucket/column/policies; drops and recreates RPCs with new return shape.
--
-- Preserves all existing rows. cover_photo_url defaults to NULL for every member.
-- Does not copy Jake's cover (or any image) onto other profiles.

-- ---------------------------------------------------------------------------
-- 1. Column — storage path in member-profile-media bucket (NULL = no cover)
-- ---------------------------------------------------------------------------

alter table public.member_profiles
  add column if not exists cover_photo_url text;

comment on column public.member_profiles.cover_photo_url is
  'Storage path in member-profile-media bucket, e.g. {auth_user_id}/cover/{uuid}.webp';

-- Normalize empty strings to NULL without touching non-empty values.
update public.member_profiles
set cover_photo_url = null
where cover_photo_url is not null
  and btrim(cover_photo_url) = '';

-- ---------------------------------------------------------------------------
-- 2. Storage bucket (private — signed URLs from the client)
-- Path convention:
--   {auth_user_id}/cover/{uuid}.{ext}
--   {auth_user_id}/avatar/{uuid}.{ext}
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'member-profile-media',
  'member-profile-media',
  false,
  12582912,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- 3. Storage object policies — member-profile-media
-- ---------------------------------------------------------------------------

drop policy if exists "Portal members can read member profile media"
  on storage.objects;
drop policy if exists "Members can upload own member profile media"
  on storage.objects;
drop policy if exists "Members can update own member profile media"
  on storage.objects;
drop policy if exists "Members can delete own member profile media"
  on storage.objects;

create policy "Portal members can read member profile media"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'member-profile-media'
    and public.current_user_has_portal_access()
  );

create policy "Members can upload own member profile media"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'member-profile-media'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (storage.foldername(name))[2] in ('cover', 'avatar')
    and public.current_user_has_portal_access()
  );

create policy "Members can update own member profile media"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'member-profile-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'member-profile-media'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (storage.foldername(name))[2] in ('cover', 'avatar')
  );

create policy "Members can delete own member profile media"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'member-profile-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- 4. Portal profile RPCs — add cover_photo_url (drop/recreate for return shape)
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
