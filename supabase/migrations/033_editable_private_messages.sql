-- Editable private messages: audit columns + secure edit RPC.
-- Run in Supabase SQL Editor after migration 032.
-- Safe to rerun: uses IF NOT EXISTS; no rows deleted.

alter table public.private_messages
  add column if not exists edited_at timestamptz,
  add column if not exists original_body text;

drop function if exists public.edit_private_message(uuid, text);

create function public.edit_private_message(
  p_message_id uuid,
  p_new_body text
)
returns table (
  id uuid,
  body text,
  edited_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_message public.private_messages%rowtype;
  v_trimmed text;
  v_max_length constant integer := 2000;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'You must be signed in to edit a message.';
  end if;

  v_trimmed := trim(coalesce(p_new_body, ''));

  if v_trimmed = '' then
    raise exception 'Message cannot be empty.';
  end if;

  if char_length(v_trimmed) > v_max_length then
    raise exception 'Message cannot exceed % characters.', v_max_length;
  end if;

  select *
  into v_message
  from public.private_messages pm
  where pm.id = p_message_id;

  if not found then
    raise exception 'Message not found.';
  end if;

  if v_message.sender_id <> v_user_id then
    raise exception 'You can only edit messages you sent.';
  end if;

  if v_message.created_at < now() - interval '24 hours' then
    raise exception 'Messages can only be edited within 24 hours of sending.';
  end if;

  if v_trimmed = trim(v_message.body) then
    raise exception 'No changes to save.';
  end if;

  if not public.can_read_private_message(
    v_message.introduction_request_id,
    v_message.sender_id,
    v_message.receiver_id,
    v_user_id
  ) then
    raise exception 'You do not have access to this message.';
  end if;

  update public.private_messages pm
  set
    body = v_trimmed,
    original_body = coalesce(pm.original_body, pm.body),
    edited_at = now()
  where pm.id = p_message_id;

  return query
  select pm.id, pm.body, pm.edited_at, pm.created_at
  from public.private_messages pm
  where pm.id = p_message_id;
end;
$$;

revoke all on function public.edit_private_message(uuid, text) from public;
grant execute on function public.edit_private_message(uuid, text) to authenticated;
