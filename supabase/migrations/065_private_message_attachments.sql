-- Private message image attachments (DM V1).
-- Safe to rerun: idempotent bucket/table/policies; replaces receiver UPDATE with mark-read RPCs.
-- Does not modify existing message bodies or historical rows.
--
-- Path convention in private-message-media:
--   {sender_uid}/{message_id}/{uuid}.{ext}

-- ---------------------------------------------------------------------------
-- 1. Attachments table
-- ---------------------------------------------------------------------------

create table if not exists public.private_message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.private_messages (id) on delete cascade,
  storage_path text not null,
  content_type text not null,
  byte_size integer not null check (byte_size > 0),
  width integer null check (width is null or width > 0),
  height integer null check (height is null or height > 0),
  sort_order smallint not null default 0 check (sort_order >= 0 and sort_order < 3),
  created_at timestamptz not null default now(),
  constraint private_message_attachments_path_unique unique (storage_path),
  constraint private_message_attachments_content_type_check
    check (content_type in ('image/jpeg', 'image/png', 'image/webp'))
);

create index if not exists private_message_attachments_message_id_sort_idx
  on public.private_message_attachments (message_id, sort_order);

comment on table public.private_message_attachments is
  'Image attachments for private_messages. Body text may be empty when attachments exist; app enforces text-or-image.';

alter table public.private_message_attachments enable row level security;

drop policy if exists "Participants can read private message attachments"
  on public.private_message_attachments;
drop policy if exists "Senders can insert private message attachments"
  on public.private_message_attachments;
drop policy if exists "Senders can delete private message attachments"
  on public.private_message_attachments;

create policy "Participants can read private message attachments"
  on public.private_message_attachments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.private_messages pm
      where pm.id = message_id
        and public.can_read_private_message(
          pm.introduction_request_id,
          pm.sender_id,
          pm.receiver_id,
          auth.uid()
        )
    )
  );

create policy "Senders can insert private message attachments"
  on public.private_message_attachments
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.private_messages pm
      where pm.id = message_id
        and pm.sender_id = auth.uid()
        and public.can_read_private_message(
          pm.introduction_request_id,
          pm.sender_id,
          pm.receiver_id,
          auth.uid()
        )
    )
  );

create policy "Senders can delete private message attachments"
  on public.private_message_attachments
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.private_messages pm
      where pm.id = message_id
        and pm.sender_id = auth.uid()
    )
  );

revoke all on table public.private_message_attachments from public;
grant select, insert, delete on table public.private_message_attachments to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Storage bucket (private, participant-scoped reads)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'private-message-media',
  'private-message-media',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Participants can read private message media"
  on storage.objects;
drop policy if exists "Senders can upload private message media"
  on storage.objects;
drop policy if exists "Senders can update private message media"
  on storage.objects;
drop policy if exists "Senders can delete private message media"
  on storage.objects;

create policy "Participants can read private message media"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'private-message-media'
    and exists (
      select 1
      from public.private_message_attachments a
      join public.private_messages pm on pm.id = a.message_id
      where a.storage_path = name
        and pm.id::text = (storage.foldername(name))[2]
        and pm.sender_id::text = (storage.foldername(name))[1]
        and public.can_read_private_message(
          pm.introduction_request_id,
          pm.sender_id,
          pm.receiver_id,
          auth.uid()
        )
    )
  );

create policy "Senders can upload private message media"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'private-message-media'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.current_user_has_portal_access()
    and exists (
      select 1
      from public.private_messages pm
      where pm.id::text = (storage.foldername(name))[2]
        and pm.sender_id = auth.uid()
    )
  );

create policy "Senders can update private message media"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'private-message-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'private-message-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Senders can delete private message media"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'private-message-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- 3. Tighten receiver UPDATE — mark-read via SECURITY DEFINER RPCs only
-- ---------------------------------------------------------------------------

drop policy if exists "Receivers can mark private messages read"
  on public.private_messages;

create or replace function public.mark_direct_private_messages_read(p_other_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  if auth.uid() is null or p_other_user_id is null or p_other_user_id = auth.uid() then
    return 0;
  end if;

  update public.private_messages
  set read_at = now()
  where introduction_request_id is null
    and sender_id = p_other_user_id
    and receiver_id = auth.uid()
    and read_at is null;

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

create or replace function public.mark_introduction_private_messages_read(p_introduction_request_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  if auth.uid() is null or p_introduction_request_id is null then
    return 0;
  end if;

  if not public.is_accepted_introduction_participant(p_introduction_request_id, auth.uid()) then
    return 0;
  end if;

  update public.private_messages
  set read_at = now()
  where introduction_request_id = p_introduction_request_id
    and receiver_id = auth.uid()
    and read_at is null;

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

revoke all on function public.mark_direct_private_messages_read(uuid) from public;
revoke all on function public.mark_introduction_private_messages_read(uuid) from public;
grant execute on function public.mark_direct_private_messages_read(uuid) to authenticated;
grant execute on function public.mark_introduction_private_messages_read(uuid) to authenticated;

-- Allow senders to delete their own message (cleanup after failed image-only sends).
drop policy if exists "Senders can delete own private messages"
  on public.private_messages;

create policy "Senders can delete own private messages"
  on public.private_messages
  for delete
  to authenticated
  using (sender_id = auth.uid());
