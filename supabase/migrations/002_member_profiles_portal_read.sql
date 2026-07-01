-- Allow authenticated members to read verified profiles in the member portal.

create policy "Members can read verified profiles"
  on public.member_profiles
  for select
  to authenticated
  using (is_verified = true);
