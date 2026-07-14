-- Ensure course detail RPC returns architect + year_opened (including curated courses).
-- Safe to rerun: replaces get_golf_course_by_slug only; no data deleted.

drop function if exists public.get_golf_course_by_slug(text);

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
    gc.architect,
    gc.year_opened,
    coalesce(s.round_count, 0)::bigint,
    coalesce(s.member_count, 0)::bigint,
    s.recommend_pct,
    s.avg_rating,
    s.latest_activity_at
  from public.golf_courses gc
  left join lateral public.golf_course_activity_stats(gc.id) s on true
  where gc.slug = trim(p_slug)
    and (
      gc.lifecycle_status = 'published'
      or gc.source_name = 'elitetee_curated'
    )
  limit 1;
$$;

revoke all on function public.get_golf_course_by_slug(text) from public;
grant execute on function public.get_golf_course_by_slug(text) to authenticated;

