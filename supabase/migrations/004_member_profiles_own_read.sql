-- Allow members to read their own profile for introduction request sender lookup.

drop policy if exists "Members can read own profile by email" on public.member_profiles;

create policy "Members can read own profile by email"
  on public.member_profiles
  for select
  to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email'));
