-- Add member course ratings and expose averages on course pages and popularity.
-- Run in Supabase SQL Editor after migration 031.
-- Safe to rerun: uses IF NOT EXISTS and CREATE OR REPLACE.

alter table public.member_course_rounds
  add column if not exists course_rating integer;

update public.member_course_rounds
set course_rating = 10
where course_rating is null;

alter table public.member_course_rounds
  alter column course_rating set default 10;

alter table public.member_course_rounds
  alter column course_rating set not null;

alter table public.member_course_rounds
  drop constraint if exists member_course_rounds_course_rating_check;

alter table public.member_course_rounds
  add constraint member_course_rounds_course_rating_check
  check (course_rating between 1 and 10);

create or replace function public.golf_course_activity_stats(p_course_id uuid)
returns table (
  round_count bigint,
  member_count bigint,
  recommend_pct numeric,
  avg_rating numeric,
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
    case
      when count(*) = 0 then null
      else round(avg(course_rating::numeric), 1)
    end as avg_rating,
    max(greatest(played_on::timestamptz, created_at)) as latest_activity_at
  from public.member_course_rounds
  where golf_course_id = p_course_id;
$$;

revoke all on function public.golf_course_activity_stats(uuid) from public;
grant execute on function public.golf_course_activity_stats(uuid) to authenticated;

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
  avg_rating numeric,
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
      coalesce(gc.moderation_status, 'active') = 'active'
      and (
        n.q = ''
        or lower(gc.name) like '%' || n.q || '%'
        or lower(coalesce(gc.city, '')) like '%' || n.q || '%'
        or lower(coalesce(gc.region, '')) like '%' || n.q || '%'
        or lower(coalesce(gc.country, '')) like '%' || n.q || '%'
        or lower(
          trim(
            concat_ws(
              ', ',
              nullif(trim(coalesce(gc.city, '')), ''),
              nullif(trim(coalesce(gc.region, '')), ''),
              nullif(trim(coalesce(gc.country, '')), '')
            )
          )
        ) like '%' || n.q || '%'
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
    s.avg_rating,
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
  avg_rating numeric,
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
    stats.avg_rating,
    stats.latest_activity_at
  from (
    select
      mcr.golf_course_id,
      count(*)::bigint as round_count,
      count(distinct mcr.member_user_id)::bigint as member_count,
      case
        when count(*) = 0 then null
        else round(
          (count(*) filter (where mcr.would_play_again = true))::numeric
          / count(*)::numeric
          * 100,
          0
        )
      end as recommend_pct,
      round(avg(mcr.course_rating::numeric), 1) as avg_rating,
      max(greatest(mcr.played_on::timestamptz, mcr.created_at)) as latest_activity_at
    from public.member_course_rounds mcr
    where mcr.golf_course_id is not null
    group by mcr.golf_course_id
  ) stats
  join public.golf_courses gc on gc.id = stats.golf_course_id
  where coalesce(gc.moderation_status, 'active') = 'active'
  order by
    stats.member_count desc,
    stats.avg_rating desc nulls last,
    stats.recommend_pct desc nulls last,
    stats.round_count desc,
    gc.name asc
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
  avg_rating numeric,
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
    s.avg_rating,
    s.latest_activity_at
  from public.golf_courses gc
  left join lateral public.golf_course_activity_stats(gc.id) s on true
  where gc.slug = trim(p_slug)
    and coalesce(gc.moderation_status, 'active') = 'active'
  limit 1;
$$;

revoke all on function public.get_golf_course_by_slug(text) from public;
grant execute on function public.get_golf_course_by_slug(text) to authenticated;
