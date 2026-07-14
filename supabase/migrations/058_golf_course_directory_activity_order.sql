-- Directory integrity: surface reviewed courses first, exclude hidden rows,
-- and expose server-side geo counts for accurate regional totals.
-- Safe to rerun: replaces search_golf_courses + adds geo counts RPC only.

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
  par integer,
  yardage integer,
  description text,
  image_url text,
  thumbnail_url text,
  image_source text,
  image_attribution text,
  image_license text,
  image_updated_at timestamptz,
  source_name text,
  submitted_by_member boolean,
  architect text,
  year_opened integer,
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
  terms as (
    select unnest(public.golf_course_location_search_terms((select q from normalized))) as term
  ),
  visible as (
    select
      gc.*,
      coalesce(s.round_count, 0)::bigint as activity_round_count,
      s.latest_activity_at as activity_latest
    from public.golf_courses gc
    left join lateral public.golf_course_activity_stats(gc.id) s on true
    cross join normalized n
    where gc.lifecycle_status <> 'hidden'
      and (
        gc.lifecycle_status = 'published'
        or gc.source_name = 'elitetee_curated'
      )
      and (
        n.q = ''
        or exists (
          select 1
          from terms t
          where lower(gc.name) like '%' || t.term || '%'
            or lower(coalesce(gc.city, '')) like '%' || t.term || '%'
            or lower(coalesce(gc.region, '')) like '%' || t.term || '%'
            or lower(coalesce(gc.country, '')) like '%' || t.term || '%'
            or lower(
              trim(
                concat_ws(
                  ', ',
                  nullif(trim(coalesce(gc.city, '')), ''),
                  nullif(trim(coalesce(gc.region, '')), ''),
                  nullif(trim(coalesce(gc.country, '')), '')
                )
              )
            ) like '%' || t.term || '%'
        )
      )
  ),
  filtered as (
    select v.*
    from visible v
    order by
      v.activity_round_count desc,
      v.activity_latest desc nulls last,
      v.name asc
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
    f.par,
    f.yardage,
    f.description,
    f.image_url,
    f.thumbnail_url,
    f.image_source,
    f.image_attribution,
    f.image_license,
    f.image_updated_at,
    f.source_name,
    f.submitted_by_member,
    f.architect,
    f.year_opened,
    coalesce(s.round_count, 0)::bigint as round_count,
    coalesce(s.member_count, 0)::bigint as member_count,
    s.recommend_pct,
    s.avg_rating,
    s.latest_activity_at
  from filtered f
  left join lateral public.golf_course_activity_stats(f.id) s on true;
$$;

drop function if exists public.golf_course_directory_geo_counts(text);

create function public.golf_course_directory_geo_counts(
  p_query text default ''
)
returns table (
  country text,
  region text,
  course_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with normalized as (
    select trim(lower(coalesce(p_query, ''))) as q
  ),
  terms as (
    select unnest(public.golf_course_location_search_terms((select q from normalized))) as term
  )
  select
    coalesce(nullif(trim(gc.country), ''), 'Country not specified') as country,
    coalesce(nullif(trim(gc.region), ''), 'Region not specified') as region,
    count(*)::bigint as course_count
  from public.golf_courses gc
  cross join normalized n
  where gc.lifecycle_status <> 'hidden'
    and (
      gc.lifecycle_status = 'published'
      or gc.source_name = 'elitetee_curated'
    )
    and (
      n.q = ''
      or exists (
        select 1
        from terms t
        where lower(gc.name) like '%' || t.term || '%'
          or lower(coalesce(gc.city, '')) like '%' || t.term || '%'
          or lower(coalesce(gc.region, '')) like '%' || t.term || '%'
          or lower(coalesce(gc.country, '')) like '%' || t.term || '%'
          or lower(
            trim(
              concat_ws(
                ', ',
                nullif(trim(coalesce(gc.city, '')), ''),
                nullif(trim(coalesce(gc.region, '')), ''),
                nullif(trim(coalesce(gc.country, '')), '')
              )
            )
          ) like '%' || t.term || '%'
      )
    )
  group by 1, 2
  order by 1 asc, 2 asc;
$$;

revoke all on function public.search_golf_courses(text, integer, integer) from public;
grant execute on function public.search_golf_courses(text, integer, integer) to authenticated;

revoke all on function public.golf_course_directory_geo_counts(text) from public;
grant execute on function public.golf_course_directory_geo_counts(text) to authenticated;
