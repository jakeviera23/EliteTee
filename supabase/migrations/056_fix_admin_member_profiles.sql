-- Fix Admin dashboard load failure: restore member_profiles.created_at and align admin RLS.
-- Safe to rerun: uses IF NOT EXISTS / DROP POLICY IF EXISTS.

alter table public.member_profiles
  add column if not exists created_at timestamptz;

update public.member_profiles
set created_at = coalesce(created_at, updated_at, now())
where created_at is null;

alter table public.member_profiles
  alter column created_at set default now();

-- Backfill complete; enforce not null for new rows going forward.
alter table public.member_profiles
  alter column created_at set not null;

-- Admin policies must match current_user_is_admin() (migration 037), not placeholder emails.
drop policy if exists "Admins can read member profiles" on public.member_profiles;

create policy "Admins can read member profiles"
  on public.member_profiles
  for select
  to authenticated
  using (public.current_user_is_admin());

drop policy if exists "Admins can insert member profiles" on public.member_profiles;

create policy "Admins can insert member profiles"
  on public.member_profiles
  for insert
  to authenticated
  with check (public.current_user_is_admin());

drop policy if exists "Admins can update member profiles" on public.member_profiles;

create policy "Admins can update member profiles"
  on public.member_profiles
  for update
  to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());
