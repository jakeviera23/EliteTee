-- Fix "column reference slug is ambiguous" during member course linking / Share Experience.
-- Safe to rerun: replaces find_or_create_member_golf_course_internal + wrapper only; no data deleted.

create or replace function public.find_or_create_member_golf_course_internal(
  p_course_name text,
  p_location text,
  p_created_by_user_id uuid default null
)
returns table (
  golf_course_id uuid,
  slug text,
  created_new boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_location text;
  v_city text;
  v_region text;
  v_country text;
  v_match_id uuid;
  v_match_slug text;
  v_generated_slug text;
  v_inserted_slug text;
begin
  v_name := trim(coalesce(p_course_name, ''));
  v_location := trim(coalesce(p_location, ''));

  if char_length(v_name) < 2 or char_length(v_name) > 200 then
    raise exception 'Course name must be between 2 and 200 characters.';
  end if;

  if char_length(v_location) < 2 or char_length(v_location) > 200 then
    raise exception 'Location must be between 2 and 200 characters.';
  end if;

  v_name := regexp_replace(v_name, '[[:cntrl:]]', '', 'g');
  v_location := regexp_replace(v_location, '[[:cntrl:]]', '', 'g');

  select pl.city, pl.region, pl.country
  into v_city, v_region, v_country
  from public.parse_golf_course_location(v_location) pl;

  select gc.id, gc.slug
  into v_match_id, v_match_slug
  from public.golf_courses gc
  where public.normalize_golf_course_name(gc.name) = public.normalize_golf_course_name(v_name)
    and public.golf_course_location_matches(v_location, gc.city, gc.region, gc.country)
  order by
    case
      when gc.source_name in ('elitetee_seed', 'elitetee_curated') then 0
      else 1
    end,
    gc.submitted_by_member asc,
    gc.created_at asc
  limit 1;

  if v_match_id is not null then
    golf_course_id := v_match_id;
    slug := v_match_slug;
    created_new := false;
    return next;
    return;
  end if;

  v_generated_slug := public.generate_unique_golf_course_slug(v_name, v_city, v_region);

  insert into public.golf_courses (
    name,
    slug,
    city,
    region,
    country,
    source_name,
    created_by_user_id,
    lifecycle_status,
    submitted_at,
    submitted_by_member
  )
  values (
    v_name,
    v_generated_slug,
    v_city,
    v_region,
    v_country,
    'member_submitted',
    p_created_by_user_id,
    'published',
    now(),
    true
  )
  returning public.golf_courses.id, public.golf_courses.slug
  into golf_course_id, v_inserted_slug;

  slug := v_inserted_slug;
  created_new := true;
  return next;
end;
$$;

create or replace function public.find_or_create_member_golf_course(
  p_course_name text,
  p_location text
)
returns table (
  golf_course_id uuid,
  slug text,
  created_new boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_user_has_portal_access() then
    raise exception 'You must be an approved portal member to add courses.';
  end if;

  return query
  select *
  from public.find_or_create_member_golf_course_internal(
    p_course_name,
    p_location,
    auth.uid()
  );
end;
$$;

revoke all on function public.find_or_create_member_golf_course(text, text) from public;
grant execute on function public.find_or_create_member_golf_course(text, text) to authenticated;

