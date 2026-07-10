-- Link member-submitted manual course rounds to the golf_courses directory.
-- Run in Supabase SQL Editor after migration 028.
-- Does NOT modify member_course_rounds review text, dates, notes, or would_play_again.

-- ---------------------------------------------------------------------------
-- Member-submitted course metadata
-- ---------------------------------------------------------------------------

alter table public.golf_courses
  add column if not exists created_by_user_id uuid references auth.users (id) on delete set null,
  add column if not exists moderation_status text not null default 'active',
  add column if not exists submitted_at timestamptz,
  add column if not exists submitted_by_member boolean not null default false;

alter table public.golf_courses
  drop constraint if exists golf_courses_moderation_status_check;

alter table public.golf_courses
  add constraint golf_courses_moderation_status_check
  check (moderation_status in ('active', 'pending', 'hidden'));

create index if not exists golf_courses_submitted_by_member_idx
  on public.golf_courses (submitted_by_member)
  where submitted_by_member = true;

-- ---------------------------------------------------------------------------
-- Location parsing and matching helpers
-- ---------------------------------------------------------------------------

create or replace function public.parse_golf_course_location(p_location text)
returns table (
  city text,
  region text,
  country text
)
language plpgsql
immutable
as $$
declare
  parts text[];
  part_count integer;
begin
  city := null;
  region := null;
  country := null;

  select coalesce(array_agg(trim(part)), array[]::text[])
  into parts
  from unnest(string_to_array(coalesce(p_location, ''), ',')) as part
  where trim(part) <> '';

  part_count := coalesce(array_length(parts, 1), 0);

  if part_count = 0 then
    return;
  elsif part_count = 1 then
    city := parts[1];
  elsif part_count = 2 then
    city := parts[1];
    region := parts[2];
  else
    city := parts[1];
    region := parts[2];
    country := parts[part_count];
  end if;

  return next;
end;
$$;

create or replace function public.normalize_golf_course_name(p_name text)
returns text
language sql
immutable
as $$
  select trim(regexp_replace(lower(trim(coalesce(p_name, ''))), '\s+', ' ', 'g'));
$$;

create or replace function public.golf_course_location_matches(
  p_location text,
  p_city text,
  p_region text,
  p_country text
)
returns boolean
language sql
immutable
as $$
  with parsed as (
    select pl.city as input_city, pl.region as input_region, pl.country as input_country
    from public.parse_golf_course_location(p_location) pl
  )
  select
    trim(coalesce(p_location, '')) = ''
    or (
      p_city is not null
      and trim(p_city) <> ''
      and (
        lower(trim(p_location)) like '%' || lower(trim(p_city)) || '%'
        or exists (
          select 1 from parsed
          where input_city is not null
            and lower(trim(input_city)) = lower(trim(p_city))
        )
      )
    )
    or (
      p_region is not null
      and trim(p_region) <> ''
      and (
        lower(trim(p_location)) like '%' || lower(trim(p_region)) || '%'
        or exists (
          select 1 from parsed
          where input_region is not null
            and lower(trim(input_region)) = lower(trim(p_region))
        )
      )
    )
    or (
      p_country is not null
      and trim(p_country) <> ''
      and (
        lower(trim(p_location)) like '%' || lower(trim(p_country)) || '%'
        or exists (
          select 1 from parsed
          where input_country is not null
            and lower(trim(input_country)) = lower(trim(p_country))
        )
      )
    );
$$;

create or replace function public.generate_unique_golf_course_slug(
  p_name text,
  p_city text default null,
  p_region text default null
)
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  base_slug text;
  location_slug text;
  candidate text;
  suffix integer := 0;
begin
  base_slug := public.slugify_golf_course_name(p_name);
  if base_slug = '' then
    base_slug := 'golf-course';
  end if;

  if p_city is not null and trim(p_city) <> '' then
    location_slug := public.slugify_golf_course_name(p_city);
    if location_slug <> '' then
      candidate := base_slug || '-' || location_slug;
      if not exists (select 1 from public.golf_courses gc where gc.slug = candidate) then
        return candidate;
      end if;
    end if;
  elsif p_region is not null and trim(p_region) <> '' then
    location_slug := public.slugify_golf_course_name(p_region);
    if location_slug <> '' then
      candidate := base_slug || '-' || location_slug;
      if not exists (select 1 from public.golf_courses gc where gc.slug = candidate) then
        return candidate;
      end if;
    end if;
  end if;

  candidate := base_slug;
  loop
    if not exists (select 1 from public.golf_courses gc where gc.slug = candidate) then
      return candidate;
    end if;
    suffix := suffix + 1;
    candidate := base_slug || '-' || suffix::text;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Internal find-or-create (used by RPC + backfill)
-- ---------------------------------------------------------------------------

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
  v_slug text;
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
    case when gc.source_name = 'elitetee_seed' then 0 else 1 end,
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

  v_slug := public.generate_unique_golf_course_slug(v_name, v_city, v_region);

  insert into public.golf_courses (
    name,
    slug,
    city,
    region,
    country,
    source_name,
    created_by_user_id,
    moderation_status,
    submitted_at,
    submitted_by_member
  )
  values (
    v_name,
    v_slug,
    v_city,
    v_region,
    v_country,
    'member_submitted',
    p_created_by_user_id,
    'active',
    now(),
    true
  )
  returning id, slug into golf_course_id, slug;

  created_new := true;
  return next;
end;
$$;

revoke all on function public.find_or_create_member_golf_course_internal(text, text, uuid) from public;

-- ---------------------------------------------------------------------------
-- Portal member RPC (controlled insert path)
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- Backfill unmatched member rounds (golf_course_id only)
-- ---------------------------------------------------------------------------

create or replace function public.backfill_member_course_round_golf_links()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_result record;
  v_updated integer := 0;
begin
  for r in
    select distinct
      trim(course_name) as course_name,
      trim(location) as location
    from public.member_course_rounds
    where golf_course_id is null
      and char_length(trim(course_name)) > 0
      and char_length(trim(location)) > 0
  loop
    select *
    into v_result
    from public.find_or_create_member_golf_course_internal(
      r.course_name,
      r.location,
      null
    );

    update public.member_course_rounds mcr
    set golf_course_id = v_result.golf_course_id
    where mcr.golf_course_id is null
      and trim(mcr.course_name) = r.course_name
      and trim(mcr.location) = r.location;

    v_updated := v_updated + 1;
  end loop;

  return v_updated;
end;
$$;

revoke all on function public.backfill_member_course_round_golf_links() from public;

select public.backfill_member_course_round_golf_links();

-- ---------------------------------------------------------------------------
-- Extend course RPCs with member-submitted metadata
-- ---------------------------------------------------------------------------

drop function if exists public.search_golf_courses(text, integer, integer);
drop function if exists public.popular_golf_courses(integer);
drop function if exists public.get_golf_course_by_slug(text);

create function public.search_golf_courses(
  p_query text default '',
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  external_id text,
  name text,
  slug text,
  city text,
  region text,
  country text,
  latitude numeric,
  longitude numeric,
  website_url text,
  course_type text,
  access_type text,
  holes integer,
  description text,
  image_url text,
  thumbnail_url text,
  image_source text,
  image_attribution text,
  image_license text,
  image_updated_at timestamptz,
  source_name text,
  submitted_by_member boolean,
  round_count bigint,
  member_count bigint,
  recommend_pct numeric,
  latest_activity_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with normalized as (
    select trim(lower(coalesce(p_query, ''))) as q
  ),
  filtered as (
    select gc.*
    from public.golf_courses gc
    cross join normalized n
    where
      gc.moderation_status = 'active'
      and (
        n.q = ''
        or lower(gc.name) like '%' || n.q || '%'
        or lower(coalesce(gc.city, '')) like '%' || n.q || '%'
        or lower(coalesce(gc.region, '')) like '%' || n.q || '%'
        or lower(coalesce(gc.country, '')) like '%' || n.q || '%'
      )
    order by gc.name asc
    limit greatest(1, least(coalesce(p_limit, 20), 50))
    offset greatest(coalesce(p_offset, 0), 0)
  )
  select
    f.id,
    f.external_id,
    f.name,
    f.slug,
    f.city,
    f.region,
    f.country,
    f.latitude,
    f.longitude,
    f.website_url,
    f.course_type,
    f.access_type,
    f.holes,
    f.description,
    f.image_url,
    f.thumbnail_url,
    f.image_source,
    f.image_attribution,
    f.image_license,
    f.image_updated_at,
    f.source_name,
    f.submitted_by_member,
    coalesce(s.round_count, 0)::bigint as round_count,
    coalesce(s.member_count, 0)::bigint as member_count,
    s.recommend_pct,
    s.latest_activity_at
  from filtered f
  left join lateral public.golf_course_activity_stats(f.id) s on true;
$$;

revoke all on function public.search_golf_courses(text, integer, integer) from public;
grant execute on function public.search_golf_courses(text, integer, integer) to authenticated;

create function public.popular_golf_courses(p_limit integer default 6)
returns table (
  id uuid,
  name text,
  slug text,
  city text,
  region text,
  country text,
  access_type text,
  course_type text,
  image_url text,
  thumbnail_url text,
  source_name text,
  submitted_by_member boolean,
  round_count bigint,
  member_count bigint,
  recommend_pct numeric,
  latest_activity_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    gc.id,
    gc.name,
    gc.slug,
    gc.city,
    gc.region,
    gc.country,
    gc.access_type,
    gc.course_type,
    gc.image_url,
    gc.thumbnail_url,
    gc.source_name,
    gc.submitted_by_member,
    stats.round_count,
    stats.member_count,
    stats.recommend_pct,
    stats.latest_activity_at
  from (
    select
      golf_course_id,
      count(*)::bigint as round_count,
      count(distinct member_user_id)::bigint as member_count,
      case
        when count(*) = 0 then null
        else round(
          (count(*) filter (where would_play_again = true))::numeric
          / count(*)::numeric
          * 100,
          0
        )
      end as recommend_pct,
      max(greatest(played_on::timestamptz, created_at)) as latest_activity_at
    from public.member_course_rounds
    where golf_course_id is not null
    group by golf_course_id
  ) stats
  join public.golf_courses gc on gc.id = stats.golf_course_id
  where gc.moderation_status = 'active'
  order by stats.member_count desc, stats.round_count desc, gc.name asc
  limit greatest(1, least(coalesce(p_limit, 6), 20));
$$;

revoke all on function public.popular_golf_courses(integer) from public;
grant execute on function public.popular_golf_courses(integer) to authenticated;

create function public.get_golf_course_by_slug(p_slug text)
returns table (
  id uuid,
  external_id text,
  name text,
  slug text,
  city text,
  region text,
  country text,
  latitude numeric,
  longitude numeric,
  website_url text,
  course_type text,
  access_type text,
  holes integer,
  description text,
  image_url text,
  thumbnail_url text,
  image_source text,
  image_attribution text,
  image_license text,
  image_updated_at timestamptz,
  source_name text,
  submitted_by_member boolean,
  round_count bigint,
  member_count bigint,
  recommend_pct numeric,
  latest_activity_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    gc.id,
    gc.external_id,
    gc.name,
    gc.slug,
    gc.city,
    gc.region,
    gc.country,
    gc.latitude,
    gc.longitude,
    gc.website_url,
    gc.course_type,
    gc.access_type,
    gc.holes,
    gc.description,
    gc.image_url,
    gc.thumbnail_url,
    gc.image_source,
    gc.image_attribution,
    gc.image_license,
    gc.image_updated_at,
    gc.source_name,
    gc.submitted_by_member,
    coalesce(s.round_count, 0)::bigint,
    coalesce(s.member_count, 0)::bigint,
    s.recommend_pct,
    s.latest_activity_at
  from public.golf_courses gc
  left join lateral public.golf_course_activity_stats(gc.id) s on true
  where gc.slug = trim(p_slug)
    and gc.moderation_status = 'active'
  limit 1;
$$;

revoke all on function public.get_golf_course_by_slug(text) from public;
grant execute on function public.get_golf_course_by_slug(text) to authenticated;
