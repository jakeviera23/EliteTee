-- Gate first-contact direct messaging behind accepted introductions.
-- Preserve backward compatibility for member pairs with existing direct threads.
--
-- Security notes (reviewed before apply):
-- * Internal helpers are SECURITY DEFINER, fully schema-qualified, search_path='',
--   row_security=off where they read RLS-protected tables, and have no PUBLIC or
--   authenticated EXECUTE (prevents pairwise existence probes).
-- * RLS-facing helpers revoke PUBLIC/anon EXECUTE, then grant authenticated only.
-- * Supabase runs each migration in a single transaction; failure rolls back entirely.

-- ---------------------------------------------------------------------------
-- Internal portal-access helper (avoids member_profiles RLS recursion)
-- ---------------------------------------------------------------------------

create or replace function public.member_has_portal_access(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select exists (
    select 1
    from public.member_profiles mp
    where mp.user_id = p_user_id
      and mp.portal_access_enabled = true
  );
$$;

revoke all on function public.member_has_portal_access(uuid) from public;
revoke all on function public.member_has_portal_access(uuid) from anon;
revoke all on function public.member_has_portal_access(uuid) from authenticated;

-- ---------------------------------------------------------------------------
-- Internal relationship helpers (not callable by authenticated clients)
-- ---------------------------------------------------------------------------

create or replace function public.members_have_accepted_introduction(
  p_user_a uuid,
  p_user_b uuid
) returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select exists (
    select 1
    from public.introduction_requests ir
    where ir.status = 'accepted'
      and (
        (ir.sender_id = p_user_a and ir.receiver_id = p_user_b)
        or (ir.sender_id = p_user_b and ir.receiver_id = p_user_a)
      )
  );
$$;

create or replace function public.members_have_existing_direct_message_thread(
  p_user_a uuid,
  p_user_b uuid
) returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select exists (
    select 1
    from public.private_messages pm
    where pm.introduction_request_id is null
      and (
        (pm.sender_id = p_user_a and pm.receiver_id = p_user_b)
        or (pm.sender_id = p_user_b and pm.receiver_id = p_user_a)
      )
  );
$$;

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
    and public.member_has_portal_access(p_user_b)
    and (
      public.members_have_accepted_introduction(p_user_a, p_user_b)
      or public.members_have_existing_direct_message_thread(p_user_a, p_user_b)
    );
$$;

revoke all on function public.members_have_accepted_introduction(uuid, uuid) from public;
revoke all on function public.members_have_accepted_introduction(uuid, uuid) from anon;
revoke all on function public.members_have_accepted_introduction(uuid, uuid) from authenticated;

revoke all on function public.members_have_existing_direct_message_thread(uuid, uuid) from public;
revoke all on function public.members_have_existing_direct_message_thread(uuid, uuid) from anon;
revoke all on function public.members_have_existing_direct_message_thread(uuid, uuid) from authenticated;

revoke all on function public.can_exchange_direct_portal_messages(uuid, uuid) from public;
revoke all on function public.can_exchange_direct_portal_messages(uuid, uuid) from anon;
revoke all on function public.can_exchange_direct_portal_messages(uuid, uuid) from authenticated;

-- ---------------------------------------------------------------------------
-- RLS-facing direct-message permission helpers
-- ---------------------------------------------------------------------------

create or replace function public.can_send_direct_portal_message(
  p_sender_id uuid,
  p_receiver_id uuid
) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_sender_id is not null
    and p_receiver_id is not null
    and p_sender_id = auth.uid()
    and public.can_exchange_direct_portal_messages(p_sender_id, p_receiver_id);
$$;

create or replace function public.can_read_private_message(
  p_introduction_request_id uuid,
  p_sender_id uuid,
  p_receiver_id uuid,
  p_user_id uuid
) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_user_id is not null
    and p_user_id = auth.uid()
    and (p_sender_id = p_user_id or p_receiver_id = p_user_id)
    and (
      (
        p_introduction_request_id is not null
        and public.is_accepted_introduction_participant(p_introduction_request_id, p_user_id)
      )
      or (
        p_introduction_request_id is null
        and public.can_exchange_direct_portal_messages(p_sender_id, p_receiver_id)
      )
    );
$$;

revoke all on function public.can_send_direct_portal_message(uuid, uuid) from public;
revoke all on function public.can_send_direct_portal_message(uuid, uuid) from anon;
revoke all on function public.can_send_direct_portal_message(uuid, uuid) from authenticated;
grant execute on function public.can_send_direct_portal_message(uuid, uuid) to authenticated;

revoke all on function public.can_read_private_message(uuid, uuid, uuid, uuid) from public;
revoke all on function public.can_read_private_message(uuid, uuid, uuid, uuid) from anon;
revoke all on function public.can_read_private_message(uuid, uuid, uuid, uuid) from authenticated;
grant execute on function public.can_read_private_message(uuid, uuid, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Public aggregate: unique accepted-intro connections for a member
-- ---------------------------------------------------------------------------

create or replace function public.count_member_connections(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select count(distinct counterpart_id)::integer
  from (
    select case
      when ir.sender_id = p_user_id then ir.receiver_id
      else ir.sender_id
    end as counterpart_id
    from public.introduction_requests ir
    where ir.status = 'accepted'
      and p_user_id is not null
      and (ir.sender_id = p_user_id or ir.receiver_id = p_user_id)
  ) connected;
$$;

revoke all on function public.count_member_connections(uuid) from public;
revoke all on function public.count_member_connections(uuid) from anon;
revoke all on function public.count_member_connections(uuid) from authenticated;
grant execute on function public.count_member_connections(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Introduction request integrity (new writes only; historical rows untouched)
-- ---------------------------------------------------------------------------

drop policy if exists "Members can insert introduction requests" on public.introduction_requests;

create policy "Members can insert introduction requests"
  on public.introduction_requests
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and sender_id <> receiver_id
    and status = 'pending'
    and char_length(btrim(message)) >= 20
    and not exists (
      select 1
      from public.introduction_requests ir
      where ir.status = 'accepted'
        and (
          (
            ir.sender_id = introduction_requests.sender_id
            and ir.receiver_id = introduction_requests.receiver_id
          )
          or (
            ir.sender_id = introduction_requests.receiver_id
            and ir.receiver_id = introduction_requests.sender_id
          )
        )
    )
  );
