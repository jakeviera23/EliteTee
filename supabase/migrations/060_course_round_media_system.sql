-- Course round media system: community course hero fallback, video support, featured display RPC.
-- Safe to rerun. Does not rewrite existing photo rows or golf_courses image URLs.

-- ---------------------------------------------------------------------------
-- Storage bucket: allow common iPhone video formats + larger uploads
-- ---------------------------------------------------------------------------

update storage.buckets
set
  file_size_limit = 104857600, -- 100 MB
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/webm'
  ]
where id = 'course-round-photos';

-- ---------------------------------------------------------------------------
-- Photo/media columns
-- ---------------------------------------------------------------------------

alter table public.member_course_round_photos
  add column if not exists media_kind text not null default 'image';

alter table public.member_course_round_photos
  add column if not exists duration_seconds numeric;

alter table public.member_course_round_photos
  add column if not exists poster_storage_path text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'member_course_round_photos_media_kind_check'
  ) then
    alter table public.member_course_round_photos
      add constraint member_course_round_photos_media_kind_check
      check (media_kind in ('image', 'video'));
  end if;
end $$;

create index if not exists member_course_round_photos_course_active_image_idx
  on public.member_course_round_photos (golf_course_id, created_at desc)
  where moderation_status = 'active'
    and hidden_at is null
    and media_kind = 'image';

-- ---------------------------------------------------------------------------
-- Protect media_kind / poster path from member tampering after insert
-- ---------------------------------------------------------------------------

create or replace function public.prevent_member_course_round_photo_privileged_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Allow security-definer RPCs (e.g. set_course_community_display_photo) to flip is_featured.
  if coalesce(current_setting('app.allow_round_photo_privileged_update', true), '') = 'on' then
    return new;
  end if;

  if coalesce(auth.role(), '') = 'authenticated' then
    if new.is_featured is distinct from old.is_featured
       or new.moderation_status is distinct from old.moderation_status
       or new.hidden_at is distinct from old.hidden_at
       or new.hidden_reason is distinct from old.hidden_reason
       or new.golf_course_id is distinct from old.golf_course_id
       or new.storage_path is distinct from old.storage_path
       or new.poster_storage_path is distinct from old.poster_storage_path
       or new.media_kind is distinct from old.media_kind
       or new.user_id is distinct from old.user_id
       or new.member_course_round_id is distinct from old.member_course_round_id then
      raise exception 'Members cannot modify protected photo fields.';
    end if;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Community course hero: featured first, else latest active image for course
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
    and p.moderation_status = 'active'
    and p.hidden_at is null
    and coalesce(p.media_kind, 'image') = 'image'
  order by
    case when p.is_featured then 0 else 1 end,
    p.created_at desc
  limit 1;
$$;

grant execute on function public.get_featured_community_photo_path(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Set community display photo (is_featured) without writing golf_courses.image_url
-- Never needed for curated courses: CourseImage prefers official URLs first.
-- ---------------------------------------------------------------------------

create or replace function public.golf_course_has_curated_image(p_golf_course_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.golf_courses gc
    where gc.id = p_golf_course_id
      and nullif(btrim(coalesce(gc.image_url, '')), '') is not null
      and lower(coalesce(gc.image_source, '')) in ('admin', 'verified_rep')
  );
$$;

grant execute on function public.golf_course_has_curated_image(uuid) to authenticated;

drop function if exists public.set_course_community_display_photo(uuid, uuid);

create function public.set_course_community_display_photo(
  p_golf_course_id uuid,
  p_photo_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_photo record;
  v_is_admin boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if public.golf_course_has_curated_image(p_golf_course_id) then
    raise exception 'This course already has an official curated image.';
  end if;

  select
    p.id,
    p.user_id,
    p.golf_course_id,
    p.media_kind,
    p.moderation_status,
    p.hidden_at
  into v_photo
  from public.member_course_round_photos p
  where p.id = p_photo_id;

  if v_photo.id is null then
    raise exception 'Photo not found.';
  end if;

  if v_photo.golf_course_id is distinct from p_golf_course_id then
    raise exception 'Photo does not belong to this course.';
  end if;

  if v_photo.moderation_status <> 'active' or v_photo.hidden_at is not null then
    raise exception 'Photo is not available.';
  end if;

  if coalesce(v_photo.media_kind, 'image') <> 'image' then
    raise exception 'Only images can be used as the course display photo.';
  end if;

  v_is_admin := public.current_user_is_admin();

  if v_photo.user_id <> auth.uid() and not v_is_admin then
    raise exception 'You can only set your own photos as the course display image.';
  end if;

  perform set_config('app.allow_round_photo_privileged_update', 'on', true);

  update public.member_course_round_photos
  set is_featured = false
  where golf_course_id = p_golf_course_id
    and is_featured = true
    and id is distinct from p_photo_id;

  update public.member_course_round_photos
  set is_featured = true
  where id = p_photo_id;

  return p_photo_id;
end;
$$;

grant execute on function public.set_course_community_display_photo(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Cover photo validation: videos may be cover (feed lead), still must be active
-- (existing validate_member_course_round_cover_photo already allows any active media)
-- ---------------------------------------------------------------------------
