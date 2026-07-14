-- Ask EliteTee + directory search: expand US state abbreviations and aliases
-- so queries like "NY" match region "New York".
-- Safe to rerun: replaces helper + search_golf_courses only; no data deleted.

create or replace function public.golf_course_location_search_terms(p_query text)
returns text[]
language sql
immutable
as $$
  with normalized as (
    select trim(lower(coalesce(p_query, ''))) as q
  ),
  expanded as (
    select n.q as term
    from normalized n
    where n.q <> ''

    union

    select lower(alias.canonical_name) as term
    from normalized n
    join (
      values
        ('al', 'Alabama'),
        ('alabama', 'Alabama'),
        ('ak', 'Alaska'),
        ('alaska', 'Alaska'),
        ('az', 'Arizona'),
        ('arizona', 'Arizona'),
        ('ar', 'Arkansas'),
        ('arkansas', 'Arkansas'),
        ('ca', 'California'),
        ('california', 'California'),
        ('co', 'Colorado'),
        ('colorado', 'Colorado'),
        ('ct', 'Connecticut'),
        ('connecticut', 'Connecticut'),
        ('de', 'Delaware'),
        ('delaware', 'Delaware'),
        ('fl', 'Florida'),
        ('florida', 'Florida'),
        ('ga', 'Georgia'),
        ('georgia', 'Georgia'),
        ('hi', 'Hawaii'),
        ('hawaii', 'Hawaii'),
        ('id', 'Idaho'),
        ('idaho', 'Idaho'),
        ('il', 'Illinois'),
        ('illinois', 'Illinois'),
        ('in', 'Indiana'),
        ('indiana', 'Indiana'),
        ('ia', 'Iowa'),
        ('iowa', 'Iowa'),
        ('ks', 'Kansas'),
        ('kansas', 'Kansas'),
        ('ky', 'Kentucky'),
        ('kentucky', 'Kentucky'),
        ('la', 'Louisiana'),
        ('louisiana', 'Louisiana'),
        ('me', 'Maine'),
        ('maine', 'Maine'),
        ('md', 'Maryland'),
        ('maryland', 'Maryland'),
        ('ma', 'Massachusetts'),
        ('massachusetts', 'Massachusetts'),
        ('mi', 'Michigan'),
        ('michigan', 'Michigan'),
        ('mn', 'Minnesota'),
        ('minnesota', 'Minnesota'),
        ('ms', 'Mississippi'),
        ('mississippi', 'Mississippi'),
        ('mo', 'Missouri'),
        ('missouri', 'Missouri'),
        ('mt', 'Montana'),
        ('montana', 'Montana'),
        ('ne', 'Nebraska'),
        ('nebraska', 'Nebraska'),
        ('nv', 'Nevada'),
        ('nevada', 'Nevada'),
        ('nh', 'New Hampshire'),
        ('new hampshire', 'New Hampshire'),
        ('nj', 'New Jersey'),
        ('new jersey', 'New Jersey'),
        ('nm', 'New Mexico'),
        ('new mexico', 'New Mexico'),
        ('ny', 'New York'),
        ('new york', 'New York'),
        ('nc', 'North Carolina'),
        ('north carolina', 'North Carolina'),
        ('nd', 'North Dakota'),
        ('north dakota', 'North Dakota'),
        ('oh', 'Ohio'),
        ('ohio', 'Ohio'),
        ('ok', 'Oklahoma'),
        ('oklahoma', 'Oklahoma'),
        ('or', 'Oregon'),
        ('oregon', 'Oregon'),
        ('pa', 'Pennsylvania'),
        ('pennsylvania', 'Pennsylvania'),
        ('ri', 'Rhode Island'),
        ('rhode island', 'Rhode Island'),
        ('sc', 'South Carolina'),
        ('south carolina', 'South Carolina'),
        ('sd', 'South Dakota'),
        ('south dakota', 'South Dakota'),
        ('tn', 'Tennessee'),
        ('tennessee', 'Tennessee'),
        ('tx', 'Texas'),
        ('texas', 'Texas'),
        ('ut', 'Utah'),
        ('utah', 'Utah'),
        ('vt', 'Vermont'),
        ('vermont', 'Vermont'),
        ('va', 'Virginia'),
        ('virginia', 'Virginia'),
        ('wa', 'Washington'),
        ('washington', 'Washington'),
        ('wv', 'West Virginia'),
        ('west virginia', 'West Virginia'),
        ('wi', 'Wisconsin'),
        ('wisconsin', 'Wisconsin'),
        ('wy', 'Wyoming'),
        ('wyoming', 'Wyoming'),
        ('dc', 'District of Columbia'),
        ('district of columbia', 'District of Columbia')
    ) as alias(raw_key, canonical_name)
      on alias.raw_key = n.q
  )
  select coalesce(array_agg(distinct term), array[]::text[])
  from expanded
  where term is not null and term <> '';
$$;

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

revoke all on function public.golf_course_location_search_terms(text) from public;
grant execute on function public.golf_course_location_search_terms(text) to authenticated;

revoke all on function public.search_golf_courses(text, integer, integer) from public;
grant execute on function public.search_golf_courses(text, integer, integer) to authenticated;
