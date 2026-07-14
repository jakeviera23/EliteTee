-- Member-submitted course editing (server-side auth enforced).
-- Safe to rerun: adds/replaces RPCs only; no data deleted.

drop function if exists public.can_edit_member_submitted_golf_course(uuid);

create function public.can_edit_member_submitted_golf_course(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.golf_courses gc
    where gc.id = p_course_id
      and gc.source_name = 'member_submitted'
      and gc.submitted_by_member = true
      and (
        public.current_user_is_admin()
        or gc.created_by_user_id = auth.uid()
      )
  );
$$;

revoke all on function public.can_edit_member_submitted_golf_course(uuid) from public;
grant execute on function public.can_edit_member_submitted_golf_course(uuid) to authenticated;

drop function if exists public.update_member_submitted_golf_course(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  integer
);

create function public.update_member_submitted_golf_course(
  p_course_id uuid,
  p_name text,
  p_city text,
  p_region text,
  p_country text,
  p_website_url text,
  p_course_type text,
  p_access_type text,
  p_holes integer
)
returns table (
  id uuid,
  name text,
  slug text,
  city text,
  region text,
  country text,
  website_url text,
  course_type text,
  access_type text,
  holes integer,
  source_name text,
  submitted_by_member boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_city text;
  v_region text;
  v_country text;
  v_website text;
  v_course_type text;
  v_access_type text;
  v_holes integer;
begin
  if not public.can_edit_member_submitted_golf_course(p_course_id) then
    raise exception 'You do not have permission to edit this course.';
  end if;

  v_name := trim(coalesce(p_name, ''));
  v_city := trim(coalesce(p_city, ''));
  v_region := trim(coalesce(p_region, ''));
  v_country := trim(coalesce(p_country, ''));
  v_website := nullif(trim(coalesce(p_website_url, '')), '');
  v_course_type := nullif(trim(coalesce(p_course_type, '')), '');
  v_access_type := nullif(trim(coalesce(p_access_type, '')), '');
  v_holes := p_holes;

  if v_name = '' then
    raise exception 'Course name is required.';
  end if;
  if v_city = '' then
    raise exception 'City is required.';
  end if;
  if v_region = '' then
    raise exception 'State / region is required.';
  end if;
  if v_country = '' then
    raise exception 'Country is required.';
  end if;
  if v_holes is not null and (v_holes < 1 or v_holes > 54) then
    raise exception 'Holes must be between 1 and 54.';
  end if;

  update public.golf_courses gc
  set
    name = v_name,
    city = v_city,
    region = v_region,
    country = v_country,
    website_url = v_website,
    course_type = v_course_type,
    access_type = v_access_type,
    holes = v_holes
  where gc.id = p_course_id
    and gc.source_name = 'member_submitted'
    and gc.submitted_by_member = true;

  if not found then
    raise exception 'Course not found or not editable.';
  end if;

  return query
  select
    gc.id,
    gc.name,
    gc.slug,
    gc.city,
    gc.region,
    gc.country,
    gc.website_url,
    gc.course_type,
    gc.access_type,
    gc.holes,
    gc.source_name,
    gc.submitted_by_member
  from public.golf_courses gc
  where gc.id = p_course_id;
end;
$$;

revoke all on function public.update_member_submitted_golf_course(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  integer
) from public;
grant execute on function public.update_member_submitted_golf_course(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  integer
) to authenticated;

