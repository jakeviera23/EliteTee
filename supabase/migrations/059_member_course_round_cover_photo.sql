-- Member course round cover photo selection (feed hero / gallery lead image).
-- Safe to rerun: uses IF NOT EXISTS / DROP IF EXISTS.

alter table public.member_course_rounds
  add column if not exists cover_photo_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'member_course_rounds_cover_photo_id_fkey'
  ) then
    alter table public.member_course_rounds
      add constraint member_course_rounds_cover_photo_id_fkey
      foreign key (cover_photo_id)
      references public.member_course_round_photos (id)
      on delete set null;
  end if;
end $$;

create index if not exists member_course_rounds_cover_photo_id_idx
  on public.member_course_rounds (cover_photo_id)
  where cover_photo_id is not null;

-- Ensure cover_photo_id references a photo on the same round.
create or replace function public.validate_member_course_round_cover_photo()
returns trigger
language plpgsql
as $$
declare
  v_photo_round_id uuid;
begin
  if new.cover_photo_id is null then
    return new;
  end if;

  select mcrp.member_course_round_id
  into v_photo_round_id
  from public.member_course_round_photos mcrp
  where mcrp.id = new.cover_photo_id
    and mcrp.moderation_status = 'active'
    and mcrp.hidden_at is null;

  if v_photo_round_id is null then
    raise exception 'Cover photo must be an active photo on this round.';
  end if;

  if v_photo_round_id <> new.id then
    raise exception 'Cover photo must belong to this round.';
  end if;

  return new;
end;
$$;

drop trigger if exists member_course_rounds_validate_cover_photo
  on public.member_course_rounds;

create trigger member_course_rounds_validate_cover_photo
  before insert or update of cover_photo_id
  on public.member_course_rounds
  for each row
  execute function public.validate_member_course_round_cover_photo();

-- Owner or admin can set cover without re-uploading files.
drop function if exists public.set_member_course_round_cover_photo(uuid, uuid);

create function public.set_member_course_round_cover_photo(
  p_round_id uuid,
  p_photo_id uuid
)
returns table (
  id uuid,
  cover_photo_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_round public.member_course_rounds%rowtype;
  v_photo_round_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'You must be signed in to update the cover photo.';
  end if;

  if not public.current_user_has_portal_access() then
    raise exception 'Portal access is required to update the cover photo.';
  end if;

  if p_round_id is null then
    raise exception 'Round id is required.';
  end if;

  if p_photo_id is null then
    raise exception 'Cover photo id is required.';
  end if;

  select *
  into v_round
  from public.member_course_rounds mcr
  where mcr.id = p_round_id;

  if not found then
    raise exception 'Course round not found.';
  end if;

  if v_round.member_user_id <> v_user_id and not public.current_user_is_admin() then
    raise exception 'You can only update cover photos on your own experiences.';
  end if;

  select mcrp.member_course_round_id
  into v_photo_round_id
  from public.member_course_round_photos mcrp
  where mcrp.id = p_photo_id
    and mcrp.moderation_status = 'active'
    and mcrp.hidden_at is null;

  if v_photo_round_id is null then
    raise exception 'Cover photo not found.';
  end if;

  if v_photo_round_id <> p_round_id then
    raise exception 'Cover photo must belong to this round.';
  end if;

  update public.member_course_rounds mcr
  set
    cover_photo_id = p_photo_id,
    updated_at = now()
  where mcr.id = p_round_id;

  return query
  select mcr.id, mcr.cover_photo_id
  from public.member_course_rounds mcr
  where mcr.id = p_round_id;
end;
$$;

revoke all on function public.set_member_course_round_cover_photo(uuid, uuid) from public;
grant execute on function public.set_member_course_round_cover_photo(uuid, uuid) to authenticated;
