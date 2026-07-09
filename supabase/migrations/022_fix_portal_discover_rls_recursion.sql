-- Fix infinite RLS recursion in portal discover policy (021).
--
-- Error without this fix:
--   code: 42P17
--   message: infinite recursion detected in policy for relation "member_profiles"
--
-- Cause: migration 021 checked portal access with a subquery on member_profiles
-- inside a member_profiles SELECT policy, which re-triggers the same policy.
--
-- Solution: evaluate portal access in a SECURITY DEFINER helper that bypasses RLS.

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

drop policy if exists "Portal members can read portal profiles" on public.member_profiles;

create policy "Portal members can read portal profiles"
  on public.member_profiles
  for select
  to authenticated
  using (
    portal_access_enabled = true
    and public.current_user_has_portal_access()
  );

-- Reuse the helper on feed policies so portal-access checks do not recurse via RLS.
drop policy if exists "Portal members can read feed posts" on public.member_feed_posts;
drop policy if exists "Portal members can create feed posts" on public.member_feed_posts;

create policy "Portal members can read feed posts"
  on public.member_feed_posts
  for select
  to authenticated
  using (public.current_user_has_portal_access());

create policy "Portal members can create feed posts"
  on public.member_feed_posts
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.current_user_has_portal_access()
  );
