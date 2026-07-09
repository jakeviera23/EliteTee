-- Enable direct private messaging between approved portal members.
-- Keeps introduction-request messaging when introduction_request_id is set.

alter table public.private_messages
  alter column introduction_request_id drop not null;

create or replace function public.can_send_direct_portal_message(
  p_sender_id uuid,
  p_receiver_id uuid
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_sender_id is not null
    and p_receiver_id is not null
    and p_sender_id <> p_receiver_id
    and exists (
      select 1
      from public.member_profiles mp
      where mp.user_id = p_sender_id
        and mp.portal_access_enabled = true
    )
    and exists (
      select 1
      from public.member_profiles mp
      where mp.user_id = p_receiver_id
        and mp.portal_access_enabled = true
    );
$$;

revoke all on function public.can_send_direct_portal_message(uuid, uuid) from public;
grant execute on function public.can_send_direct_portal_message(uuid, uuid) to authenticated;

create or replace function public.can_read_private_message(
  p_introduction_request_id uuid,
  p_sender_id uuid,
  p_receiver_id uuid,
  p_user_id uuid
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_user_id is not null
    and (p_sender_id = p_user_id or p_receiver_id = p_user_id)
    and (
      (
        p_introduction_request_id is not null
        and public.is_accepted_introduction_participant(p_introduction_request_id, p_user_id)
      )
      or (
        p_introduction_request_id is null
        and public.can_send_direct_portal_message(p_sender_id, p_receiver_id)
      )
    );
$$;

revoke all on function public.can_read_private_message(uuid, uuid, uuid, uuid) from public;
grant execute on function public.can_read_private_message(uuid, uuid, uuid, uuid) to authenticated;

drop policy if exists "Participants can read private messages" on public.private_messages;
drop policy if exists "Participants can send private messages" on public.private_messages;

create policy "Participants can read private messages"
  on public.private_messages
  for select
  to authenticated
  using (
    public.can_read_private_message(
      introduction_request_id,
      sender_id,
      receiver_id,
      auth.uid()
    )
  );

create policy "Participants can send private messages"
  on public.private_messages
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and (
      (
        introduction_request_id is not null
        and public.can_send_private_message(introduction_request_id, sender_id, receiver_id)
      )
      or (
        introduction_request_id is null
        and public.can_send_direct_portal_message(sender_id, receiver_id)
      )
    )
  );
