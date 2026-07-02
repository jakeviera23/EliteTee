-- Fix private_messages RLS: INSERT/SELECT policies subquery introduction_requests,
-- which was blocked by that table's own SELECT policies (accepted rows unreadable).

create or replace function public.is_accepted_introduction_participant(
  p_introduction_request_id uuid,
  p_user_id uuid
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.introduction_requests ir
    where ir.id = p_introduction_request_id
      and ir.status = 'accepted'
      and (ir.sender_id = p_user_id or ir.receiver_id = p_user_id)
  );
$$;

create or replace function public.can_send_private_message(
  p_introduction_request_id uuid,
  p_sender_id uuid,
  p_receiver_id uuid
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.introduction_requests ir
    where ir.id = p_introduction_request_id
      and ir.status = 'accepted'
      and p_sender_id <> p_receiver_id
      and (
        (ir.sender_id = p_sender_id and ir.receiver_id = p_receiver_id)
        or (ir.receiver_id = p_sender_id and ir.sender_id = p_receiver_id)
      )
  );
$$;

revoke all on function public.is_accepted_introduction_participant(uuid, uuid) from public;
revoke all on function public.can_send_private_message(uuid, uuid, uuid) from public;
grant execute on function public.is_accepted_introduction_participant(uuid, uuid) to authenticated;
grant execute on function public.can_send_private_message(uuid, uuid, uuid) to authenticated;

drop policy if exists "Participants can read private messages" on public.private_messages;
drop policy if exists "Participants can send private messages" on public.private_messages;

create policy "Participants can read private messages"
  on public.private_messages
  for select
  to authenticated
  using (
    (sender_id = auth.uid() or receiver_id = auth.uid())
    and public.is_accepted_introduction_participant(introduction_request_id, auth.uid())
  );

create policy "Participants can send private messages"
  on public.private_messages
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and public.can_send_private_message(introduction_request_id, sender_id, receiver_id)
  );
