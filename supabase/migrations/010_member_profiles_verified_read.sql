-- Fix member directory visibility for non-admin authenticated members.
-- Without this policy, only admin emails (001) can read the full member_profiles table.

drop policy if exists "Members can read verified profiles" on public.member_profiles;

create policy "Members can read verified profiles"
  on public.member_profiles
  for select
  to authenticated
  using (is_verified = true);

-- Reliable self-read for portal actions (auth.uid() = member_profiles.user_id).
drop policy if exists "Members can read own profile by user id" on public.member_profiles;

create policy "Members can read own profile by user id"
  on public.member_profiles
  for select
  to authenticated
  using (user_id = auth.uid());
