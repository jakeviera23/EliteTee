-- Member course round photos: storage bucket, metadata table, RLS, and featured community fallback.
-- Run in Supabase SQL Editor after migration 026.
-- Preserves all existing member_course_rounds rows (no data changes).

-- ---------------------------------------------------------------------------
-- Storage bucket (private — access via authenticated policies + signed URLs)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'course-round-photos',
  'course-round-photos',
  false,
  12582912,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table if not exists public.member_course_round_photos (
  id uuid primary key default gen_random_uuid(),
  member_course_round_id uuid not null
    references public.member_course_rounds (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  golf_course_id uuid references public.golf_courses (id) on delete set null,
  storage_path text not null unique,
  caption text,
  sort_order integer not null default 0,
  width integer,
  height integer,
  file_size_bytes bigint,
  mime_type text,
  is_featured boolean not null default false,
  moderation_status text not null default 'active',
  hidden_at timestamptz,
  hidden_reason text,
  created_at timestamptz not null default now(),
  constraint member_course_round_photos_moderation_status_check
    check (moderation_status in ('active', 'hidden', 'removed'))
);

create index if not exists member_course_round_photos_round_id_idx
  on public.member_course_round_photos (member_course_round_id);

create index if not exists member_course_round_photos_user_id_idx
  on public.member_course_round_photos (user_id);

create index if not exists member_course_round_photos_created_at_idx
  on public.member_course_round_photos (created_at desc);

create index if not exists member_course_round_photos_sort_order_idx
  on public.member_course_round_photos (member_course_round_id, sort_order);

create index if not exists member_course_round_photos_golf_course_id_idx
  on public.member_course_round_photos (golf_course_id)
  where golf_course_id is not null;

-- At most one featured community photo per linked course (when golf_course_id is set).
create unique index if not exists member_course_round_photos_one_featured_per_course_idx
  on public.member_course_round_photos (golf_course_id)
  where is_featured = true and golf_course_id is not null;

-- ---------------------------------------------------------------------------
-- Denormalize golf_course_id from the parent round on insert
-- ---------------------------------------------------------------------------

create or replace function public.set_member_course_round_photo_golf_course_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select mcr.golf_course_id
  into new.golf_course_id
  from public.member_course_rounds mcr
  where mcr.id = new.member_course_round_id;

  return new;
end;
$$;

drop trigger if exists member_course_round_photos_set_golf_course_id
  on public.member_course_round_photos;

create trigger member_course_round_photos_set_golf_course_id
  before insert on public.member_course_round_photos
  for each row
  execute function public.set_member_course_round_photo_golf_course_id();

-- ---------------------------------------------------------------------------
-- Block members from setting admin-only fields on update
-- ---------------------------------------------------------------------------

create or replace function public.prevent_member_course_round_photo_privileged_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'authenticated' then
    if new.is_featured is distinct from old.is_featured
       or new.moderation_status is distinct from old.moderation_status
       or new.hidden_at is distinct from old.hidden_at
       or new.hidden_reason is distinct from old.hidden_reason
       or new.golf_course_id is distinct from old.golf_course_id
       or new.storage_path is distinct from old.storage_path
       or new.user_id is distinct from old.user_id
       or new.member_course_round_id is distinct from old.member_course_round_id then
      raise exception 'Members cannot modify protected photo fields.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists member_course_round_photos_prevent_privileged_updates
  on public.member_course_round_photos;

create trigger member_course_round_photos_prevent_privileged_updates
  before update on public.member_course_round_photos
  for each row
  execute function public.prevent_member_course_round_photo_privileged_updates();

-- ---------------------------------------------------------------------------
-- RLS — member_course_round_photos
-- ---------------------------------------------------------------------------

alter table public.member_course_round_photos enable row level security;

drop policy if exists "Portal members can read active course round photos"
  on public.member_course_round_photos;
drop policy if exists "Members can insert own course round photos"
  on public.member_course_round_photos;
drop policy if exists "Members can update own course round photos"
  on public.member_course_round_photos;
drop policy if exists "Members can delete own course round photos"
  on public.member_course_round_photos;

create policy "Portal members can read active course round photos"
  on public.member_course_round_photos
  for select
  to authenticated
  using (
    moderation_status = 'active'
    and hidden_at is null
    and exists (
      select 1
      from public.member_profiles mp
      where mp.user_id = auth.uid()
        and mp.portal_access_enabled = true
    )
  );

create policy "Members can insert own course round photos"
  on public.member_course_round_photos
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and is_featured = false
    and moderation_status = 'active'
    and hidden_at is null
    and exists (
      select 1
      from public.member_profiles mp
      where mp.user_id = auth.uid()
        and mp.portal_access_enabled = true
    )
    and exists (
      select 1
      from public.member_course_rounds mcr
      where mcr.id = member_course_round_id
        and mcr.member_user_id = auth.uid()
    )
  );

create policy "Members can update own course round photos"
  on public.member_course_round_photos
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Members can delete own course round photos"
  on public.member_course_round_photos
  for delete
  to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on public.member_course_round_photos to authenticated;

-- ---------------------------------------------------------------------------
-- Storage object policies — course-round-photos bucket
-- Path pattern: {auth_user_id}/{member_course_round_id}/{uuid}.{ext}
-- ---------------------------------------------------------------------------

drop policy if exists "Portal members can read course round photos"
  on storage.objects;
drop policy if exists "Members can upload own course round photos"
  on storage.objects;
drop policy if exists "Members can delete own course round photos"
  on storage.objects;

create policy "Portal members can read course round photos"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'course-round-photos'
    and exists (
      select 1
      from public.member_profiles mp
      where mp.user_id = auth.uid()
        and mp.portal_access_enabled = true
    )
  );

create policy "Members can upload own course round photos"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'course-round-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1
      from public.member_profiles mp
      where mp.user_id = auth.uid()
        and mp.portal_access_enabled = true
    )
    and exists (
      select 1
      from public.member_course_rounds mcr
      where mcr.id::text = (storage.foldername(name))[2]
        and mcr.member_user_id = auth.uid()
    )
  );

create policy "Members can delete own course round photos"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'course-round-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- RPC: featured community photo path for course card fallback
-- ---------------------------------------------------------------------------

create or replace function public.get_featured_community_photo_path(p_golf_course_id uuid)
returns text
language sql
stable
security invoker
set search_path = public
as $$
  select p.storage_path
  from public.member_course_round_photos p
  where p.golf_course_id = p_golf_course_id
    and p.is_featured = true
    and p.moderation_status = 'active'
    and p.hidden_at is null
  order by p.created_at desc
  limit 1;
$$;

grant execute on function public.get_featured_community_photo_path(uuid) to authenticated;
