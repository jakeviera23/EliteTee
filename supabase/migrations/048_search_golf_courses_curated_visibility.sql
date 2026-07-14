-- Include elitetee_curated courses in directory search before they are published.
-- Run in Supabase SQL Editor after migration 047.
-- Safe to rerun: replaces search_golf_courses only; no data deleted.

drop function if exists public.search_golf_courses(text, integer, integer);

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
    where (
      gc.lifecycle_status = 'published'
      or gc.source_name = 'elitetee_curated'
    )
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
