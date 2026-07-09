-- Allow portal members to discover other approved members in the member portal.
-- Without this policy, selects only return is_verified profiles (010), so members
-- with portal_access_enabled may still be invisible in Discover.

drop policy if exists "Portal members can read portal profiles" on public.member_profiles;

create policy "Portal members can read portal profiles"
  on public.member_profiles
  for select
  to authenticated
  using (
    portal_access_enabled = true
    and exists (
      select 1
      from public.member_profiles mp
      where mp.user_id = auth.uid()
        and mp.portal_access_enabled = true
    )
  );
