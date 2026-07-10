-- EliteTee scalable golf course library.
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE where practical.
-- Does NOT modify or delete member_course_rounds review text, dates, or would_play_again.

-- ---------------------------------------------------------------------------
-- golf_courses master library
-- ---------------------------------------------------------------------------

create table if not exists public.golf_courses (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  name text not null,
  slug text unique not null,
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
  source_name text,
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint golf_courses_name_check check (char_length(trim(name)) > 0),
  constraint golf_courses_slug_check check (char_length(trim(slug)) > 0)
);

create index if not exists golf_courses_name_lower_idx
  on public.golf_courses (lower(name));

create index if not exists golf_courses_country_idx
  on public.golf_courses (country);

create index if not exists golf_courses_region_idx
  on public.golf_courses (region);

create index if not exists golf_courses_city_idx
  on public.golf_courses (city);

create index if not exists golf_courses_slug_idx
  on public.golf_courses (slug);

create unique index if not exists golf_courses_external_id_idx
  on public.golf_courses (external_id)
  where external_id is not null;

-- ---------------------------------------------------------------------------
-- Link member rounds (nullable — legacy rows remain valid without a link)
-- ---------------------------------------------------------------------------

alter table public.member_course_rounds
  add column if not exists golf_course_id uuid references public.golf_courses (id) on delete set null;

create index if not exists member_course_rounds_golf_course_id_idx
  on public.member_course_rounds (golf_course_id, played_on desc);

create index if not exists member_course_rounds_course_name_lower_idx
  on public.member_course_rounds (lower(trim(course_name)));

-- ---------------------------------------------------------------------------
-- RLS: portal members read; no browser writes to master library
-- ---------------------------------------------------------------------------

alter table public.golf_courses enable row level security;

drop policy if exists "Portal members can read golf courses" on public.golf_courses;

create policy "Portal members can read golf courses"
  on public.golf_courses
  for select
  to authenticated
  using (public.current_user_has_portal_access());

grant select on public.golf_courses to authenticated;

-- ---------------------------------------------------------------------------
-- Slug helper
-- ---------------------------------------------------------------------------

create or replace function public.slugify_golf_course_name(p_name text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(trim(coalesce(p_name, ''))), '[^a-z0-9]+', '-', 'g'));
$$;

-- ---------------------------------------------------------------------------
-- Course activity stats (real data from member_course_rounds only)
-- ---------------------------------------------------------------------------

create or replace function public.golf_course_activity_stats(p_course_id uuid)
returns table (
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
  where golf_course_id = p_course_id;
$$;

revoke all on function public.golf_course_activity_stats(uuid) from public;
grant execute on function public.golf_course_activity_stats(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Search golf courses (paginated, server-side)
-- ---------------------------------------------------------------------------

create or replace function public.search_golf_courses(
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
      n.q = ''
      or lower(gc.name) like '%' || n.q || '%'
      or lower(coalesce(gc.city, '')) like '%' || n.q || '%'
      or lower(coalesce(gc.region, '')) like '%' || n.q || '%'
      or lower(coalesce(gc.country, '')) like '%' || n.q || '%'
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
    coalesce(s.round_count, 0)::bigint as round_count,
    coalesce(s.member_count, 0)::bigint as member_count,
    s.recommend_pct,
    s.latest_activity_at
  from filtered f
  left join lateral public.golf_course_activity_stats(f.id) s on true;
$$;

revoke all on function public.search_golf_courses(text, integer, integer) from public;
grant execute on function public.search_golf_courses(text, integer, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Popular courses (real EliteTee activity only)
-- ---------------------------------------------------------------------------

create or replace function public.popular_golf_courses(p_limit integer default 6)
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
  order by stats.member_count desc, stats.round_count desc, gc.name asc
  limit greatest(1, least(coalesce(p_limit, 6), 20));
$$;

revoke all on function public.popular_golf_courses(integer) from public;
grant execute on function public.popular_golf_courses(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Fetch course by slug with stats
-- ---------------------------------------------------------------------------

create or replace function public.get_golf_course_by_slug(p_slug text)
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
    coalesce(s.round_count, 0)::bigint,
    coalesce(s.member_count, 0)::bigint,
    s.recommend_pct,
    s.latest_activity_at
  from public.golf_courses gc
  left join lateral public.golf_course_activity_stats(gc.id) s on true
  where gc.slug = trim(p_slug)
  limit 1;
$$;

revoke all on function public.get_golf_course_by_slug(text) from public;
grant execute on function public.get_golf_course_by_slug(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Starter directory rows (no fake member counts; no copyrighted images)
-- Migrated from the former six featured cards + Ryan's known courses for backfill.
-- ---------------------------------------------------------------------------

insert into public.golf_courses (external_id, name, slug, city, region, country, course_type, access_type, description, source_name)
values
  ('elitetee-seed-ngla', 'National Golf Links of America', 'national-golf-links-of-america', 'Southampton', 'New York', 'United States', 'links', 'private', 'Historic American links with bold landforms, wind, and a timeless sense of place.', 'elitetee_seed'),
  ('elitetee-seed-pebble', 'Pebble Beach Golf Links', 'pebble-beach-golf-links', 'Pebble Beach', 'California', 'United States', 'links', 'public', 'Iconic coastal golf above the Pacific and one of the great public golf experiences.', 'elitetee_seed'),
  ('elitetee-seed-bandon', 'Bandon Dunes', 'bandon-dunes', 'Bandon', 'Oregon', 'United States', 'links', 'public', 'A walking-golf destination built around dunes, ocean, wind, and multiple courses.', 'elitetee_seed'),
  ('elitetee-seed-standrews', 'St Andrews Links', 'st-andrews-links', 'St Andrews', 'Fife', 'Scotland', 'links', 'public', 'The home of golf, defined by history, firm turf, angles, and tradition.', 'elitetee_seed'),
  ('elitetee-seed-cabot', 'Cabot Cliffs', 'cabot-cliffs', 'Inverness', 'Nova Scotia', 'Canada', 'links', 'public', 'Dramatic cliffside golf on the Atlantic and one of the most striking modern walks.', 'elitetee_seed'),
  ('elitetee-seed-rcd', 'Royal County Down', 'royal-county-down', 'Newcastle', 'Northern Ireland', 'United Kingdom', 'links', 'private', 'Mountains, dunes, blind shots, and one of the great walking tests in golf.', 'elitetee_seed'),
  ('elitetee-seed-essex', 'Essex County Country Club', 'essex-county-country-club', 'Manchester-by-the-Sea', 'Massachusetts', 'United States', 'parkland', 'private', null, 'elitetee_seed'),
  ('elitetee-seed-liberty', 'Liberty National Golf Club', 'liberty-national-golf-club', 'Jersey City', 'New Jersey', 'United States', 'parkland', 'private', null, 'elitetee_seed')
on conflict (external_id) do update set
  name = excluded.name,
  slug = excluded.slug,
  city = excluded.city,
  region = excluded.region,
  country = excluded.country,
  course_type = excluded.course_type,
  access_type = excluded.access_type,
  description = coalesce(excluded.description, public.golf_courses.description),
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Safe backfill: only sets golf_course_id when name/location confidence is high.
-- Never modifies course_name, location, note, played_on, or would_play_again.
-- ---------------------------------------------------------------------------

update public.member_course_rounds mcr
set golf_course_id = gc.id
from public.golf_courses gc
where mcr.golf_course_id is null
  and (
    lower(trim(mcr.course_name)) = lower(trim(gc.name))
    or lower(trim(mcr.course_name)) = lower(replace(trim(gc.name), ' Golf Club', ''))
    or lower(trim(mcr.course_name)) = lower(replace(trim(gc.name), ' Country Club', ' CC'))
    or lower(trim(mcr.course_name)) like lower(trim(gc.name)) || '%'
    or lower(trim(gc.name)) like lower(trim(mcr.course_name)) || '%'
  )
  and (
    mcr.location is null
    or trim(mcr.location) = ''
    or gc.city is null
    or lower(mcr.location) like '%' || lower(gc.city) || '%'
    or lower(mcr.location) like '%' || lower(gc.region) || '%'
    or lower(mcr.location) like '%' || lower(gc.country) || '%'
  );
