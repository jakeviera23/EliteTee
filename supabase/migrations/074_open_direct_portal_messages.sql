-- Allow approved portal members to exchange direct messages without an accepted introduction.
-- Preserves introduction_requests data, intro-threaded message paths, and helper functions.
--
-- Product decision: EliteTee membership approval is the trust gate; no second intro layer.

create or replace function public.can_exchange_direct_portal_messages(
  p_user_a uuid,
  p_user_b uuid
) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_user_a is not null
    and p_user_b is not null
    and p_user_a <> p_user_b
    and (
      auth.uid() is null
      or auth.uid() in (p_user_a, p_user_b)
    )
    and public.member_has_portal_access(p_user_a)
    and public.member_has_portal_access(p_user_b);
$$;

revoke all on function public.can_exchange_direct_portal_messages(uuid, uuid) from public;
revoke all on function public.can_exchange_direct_portal_messages(uuid, uuid) from anon;
revoke all on function public.can_exchange_direct_portal_messages(uuid, uuid) from authenticated;

comment on function public.can_exchange_direct_portal_messages(uuid, uuid) is
  'True when both users have portal access. Direct DMs no longer require an accepted introduction.';
