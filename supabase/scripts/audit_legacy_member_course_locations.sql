-- =============================================================================
-- EliteTee legacy member-submitted course location audit (READ-ONLY)
-- =============================================================================
-- Purpose: List every member-submitted golf_courses row with malformed or
--          missing structured location data and show suggested cleanup values.
-- Run in: Supabase SQL Editor (preview / staging)
-- Safe:   SELECT-only — does not UPDATE golf_courses or any other table.
-- Mirrors: supabase/migrations/041_cleanup_legacy_member_course_locations.sql
-- =============================================================================

with us_states as (
  select
    t.abbrev,
    t.full_name
  from (
    values
      ('AL', 'Alabama'),
      ('AK', 'Alaska'),
      ('AZ', 'Arizona'),
      ('AR', 'Arkansas'),
      ('CA', 'California'),
      ('CO', 'Colorado'),
      ('CT', 'Connecticut'),
      ('DE', 'Delaware'),
      ('FL', 'Florida'),
      ('GA', 'Georgia'),
      ('HI', 'Hawaii'),
      ('ID', 'Idaho'),
      ('IL', 'Illinois'),
      ('IN', 'Indiana'),
      ('IA', 'Iowa'),
      ('KS', 'Kansas'),
      ('KY', 'Kentucky'),
      ('LA', 'Louisiana'),
      ('ME', 'Maine'),
      ('MD', 'Maryland'),
      ('MA', 'Massachusetts'),
      ('MI', 'Michigan'),
      ('MN', 'Minnesota'),
      ('MS', 'Mississippi'),
      ('MO', 'Missouri'),
      ('MT', 'Montana'),
      ('NE', 'Nebraska'),
      ('NV', 'Nevada'),
      ('NH', 'New Hampshire'),
      ('NJ', 'New Jersey'),
      ('NM', 'New Mexico'),
      ('NY', 'New York'),
      ('NC', 'North Carolina'),
      ('ND', 'North Dakota'),
      ('OH', 'Ohio'),
      ('OK', 'Oklahoma'),
      ('OR', 'Oregon'),
      ('PA', 'Pennsylvania'),
      ('RI', 'Rhode Island'),
      ('SC', 'South Carolina'),
      ('SD', 'South Dakota'),
      ('TN', 'Tennessee'),
      ('TX', 'Texas'),
      ('UT', 'Utah'),
      ('VT', 'Vermont'),
      ('VA', 'Virginia'),
      ('WA', 'Washington'),
      ('WV', 'West Virginia'),
      ('WI', 'Wisconsin'),
      ('WY', 'Wyoming'),
      ('DC', 'District of Columbia')
  ) as t(abbrev, full_name)
),
member_courses as (
  select
    gc.id,
    gc.name,
    gc.city,
    gc.region,
    gc.country,
    gc.source_name,
    gc.submitted_by_member,
    trim(regexp_replace(coalesce(gc.city, ''), '\s+', ' ', 'g')) as city_norm,
    trim(regexp_replace(coalesce(gc.name, ''), '\s+', ' ', 'g')) as name_norm,
    lower(trim(regexp_replace(coalesce(gc.city, ''), '\s+', ' ', 'g'))) as city_key,
    lower(trim(regexp_replace(coalesce(gc.name, ''), '\s+', ' ', 'g'))) as name_key
  from public.golf_courses gc
  where gc.moderation_status = 'active'
    and (
      gc.submitted_by_member is true
      or gc.source_name = 'member_submitted'
    )
),
round_stats as (
  select
    mcr.golf_course_id,
    count(*)::bigint as experience_count,
    string_agg(distinct nullif(trim(mcr.location), ''), ' | ' order by nullif(trim(mcr.location), '')) as round_locations,
    (
      array_agg(nullif(trim(mcr.location), '') order by mcr.played_on desc nulls last, mcr.created_at desc nulls last)
    )[1] as latest_round_location
  from public.member_course_rounds mcr
  where mcr.golf_course_id is not null
  group by mcr.golf_course_id
),
parse_inputs as (
  select
    mc.id,
    mc.name,
    mc.city,
    mc.region,
    mc.country,
    mc.source_name,
    mc.submitted_by_member,
    mc.city_norm,
    mc.name_norm,
    mc.city_key,
    mc.name_key,
    rs.experience_count,
    rs.round_locations,
    rs.latest_round_location
  from member_courses mc
  left join round_stats rs on rs.golf_course_id = mc.id
),
comma_city_parse as (
  select
    pi.id,
    trim(split_part(pi.city_norm, ',', 1)) as city,
    trim(split_part(pi.city_norm, ',', 2)) as region_raw,
    'United States'::text as country,
    'high'::text as confidence,
    'golf_courses.city'::text as parse_source
  from parse_inputs pi
  where pi.city_norm like '%,%'
    and trim(split_part(pi.city_norm, ',', 1)) <> ''
    and trim(split_part(pi.city_norm, ',', 2)) <> ''
),
suffix_city_parse as (
  select
    pi.id,
    trim(regexp_replace(pi.city_norm, '\s+[A-Za-z]{2}$', '')) as city,
    upper((regexp_match(pi.city_norm, '\s+([A-Za-z]{2})$'))[1]) as region_raw,
    'United States'::text as country,
    'high'::text as confidence,
    'golf_courses.city'::text as parse_source
  from parse_inputs pi
  where pi.city_norm ~ '\s+[A-Za-z]{2}$'
    and exists (
      select 1
      from us_states s
      where s.abbrev = upper((regexp_match(pi.city_norm, '\s+([A-Za-z]{2})$'))[1])
    )
),
state_name_city_parse as (
  select distinct on (pi.id)
    pi.id,
    trim(left(pi.city_norm, length(pi.city_norm) - length(s.full_name))) as city,
    s.full_name as region_raw,
    'United States'::text as country,
    case when length(s.full_name) > 12 then 'medium'::text else 'high'::text end as confidence,
    'golf_courses.city'::text as parse_source
  from parse_inputs pi
  join us_states s
    on lower(pi.city_norm) like '%' || lower(s.full_name)
   and right(lower(pi.city_norm), length(s.full_name)) = lower(s.full_name)
  where length(trim(left(pi.city_norm, length(pi.city_norm) - length(s.full_name)))) > 0
  order by pi.id, length(s.full_name) desc
),
normalized_parses as (
  select
    p.id,
    p.city,
    case
      when length(p.region_raw) = 2 then upper(p.region_raw)
      else coalesce(s_abbrev.full_name, initcap(p.region_raw))
    end as region,
    p.country,
    p.confidence,
    p.parse_source
  from (
    select * from comma_city_parse
    union all select * from suffix_city_parse
    union all select * from state_name_city_parse
  ) p
  left join us_states s_abbrev
    on length(p.region_raw) = 2
   and s_abbrev.abbrev = upper(p.region_raw)
),
round_rows as (
  select
    pi.id,
    trim(regexp_replace(nullif(trim(mcr.location), ''), '\s+', ' ', 'g')) as location_norm,
    mcr.played_on,
    mcr.created_at
  from parse_inputs pi
  join public.member_course_rounds mcr on mcr.golf_course_id = pi.id
  where nullif(trim(mcr.location), '') is not null
),
comma_all_round_parse as (
  select
    rr.id,
    trim(split_part(rr.location_norm, ',', 1)) as city,
    trim(split_part(rr.location_norm, ',', 2)) as region_raw,
    'United States'::text as country,
    'high'::text as confidence,
    'round_location'::text as parse_source,
    rr.played_on,
    rr.created_at
  from round_rows rr
  where rr.location_norm like '%,%'
    and trim(split_part(rr.location_norm, ',', 1)) <> ''
    and trim(split_part(rr.location_norm, ',', 2)) <> ''
),
suffix_all_round_parse as (
  select
    rr.id,
    trim(regexp_replace(rr.location_norm, '\s+[A-Za-z]{2}$', '')) as city,
    upper((regexp_match(rr.location_norm, '\s+([A-Za-z]{2})$'))[1]) as region_raw,
    'United States'::text as country,
    'high'::text as confidence,
    'round_location'::text as parse_source,
    rr.played_on,
    rr.created_at
  from round_rows rr
  where rr.location_norm ~ '\s+[A-Za-z]{2}$'
    and exists (
      select 1
      from us_states s
      where s.abbrev = upper((regexp_match(rr.location_norm, '\s+([A-Za-z]{2})$'))[1])
    )
),
state_name_all_round_parse as (
  select distinct on (rr.id, rr.played_on, rr.created_at)
    rr.id,
    trim(left(rr.location_norm, length(rr.location_norm) - length(s.full_name))) as city,
    s.full_name as region_raw,
    'United States'::text as country,
    case when length(s.full_name) > 12 then 'medium'::text else 'high'::text end as confidence,
    'round_location'::text as parse_source,
    rr.played_on,
    rr.created_at
  from round_rows rr
  join us_states s
    on lower(rr.location_norm) like '%' || lower(s.full_name)
   and right(lower(rr.location_norm), length(s.full_name)) = lower(s.full_name)
  where length(trim(left(rr.location_norm, length(rr.location_norm) - length(s.full_name)))) > 0
  order by rr.id, rr.played_on desc, rr.created_at desc, length(s.full_name) desc
),
all_round_parses as (
  select
    p.id,
    p.city,
    case
      when length(p.region_raw) = 2 then upper(p.region_raw)
      else coalesce(s_abbrev.full_name, initcap(p.region_raw))
    end as region,
    p.country,
    p.confidence,
    p.parse_source,
    p.played_on,
    p.created_at
  from (
    select id, city, region_raw, country, confidence, parse_source, played_on, created_at from comma_all_round_parse
    union all
    select id, city, region_raw, country, confidence, parse_source, played_on, created_at from suffix_all_round_parse
    union all
    select id, city, region_raw, country, confidence, parse_source, played_on, created_at from state_name_all_round_parse
  ) p
  left join us_states s_abbrev
    on length(p.region_raw) = 2
   and s_abbrev.abbrev = upper(p.region_raw)
  where p.confidence = 'high'
),
flags as (
  select
    pi.id,
    pi.name,
    pi.city,
    pi.region,
    pi.country,
    pi.source_name,
    pi.submitted_by_member,
    pi.city_norm,
    pi.name_norm,
    pi.city_key,
    pi.name_key,
    coalesce(pi.experience_count, 0) as experience_count,
    pi.round_locations,
    pi.latest_round_location,
    (pi.region is null or trim(pi.region) = '') as region_missing,
    (pi.country is null or trim(pi.country) = '') as country_missing,
    (
      pi.country is not null
      and trim(pi.country) <> ''
      and lower(trim(pi.country)) not in ('united states', 'us', 'usa', 'u.s.', 'u.s.a.', 'united states of america')
    ) as country_not_normalized,
    (pi.city is null or trim(pi.city) = '') as city_blank,
    (pi.city_key = pi.name_key) as city_equals_name,
    (
      pi.city_key <> pi.name_key
      and (
        pi.city_key like pi.name_key || '%'
        or pi.name_key like pi.city_key || '%'
      )
      and (
        pi.city_key like '%golf%'
        or pi.name_key like '%golf%'
        or pi.city_key like '%country club%'
        or pi.name_key like '%country club%'
      )
    ) as city_similar_to_name,
    exists (
      select 1
      from normalized_parses np
      where np.id = pi.id
        and np.parse_source = 'golf_courses.city'
        and np.confidence = 'high'
    ) as city_embeds_us_location,
    (
      pi.region is not null
      and trim(pi.region) <> ''
      and pi.city is not null
      and trim(pi.city) <> ''
      and lower(trim(coalesce(pi.country, ''))) in ('united states', 'us', 'usa', 'u.s.', 'u.s.a.', 'united states of america')
      and pi.city_key <> pi.name_key
      and not (
        pi.city_key <> pi.name_key
        and (
          pi.city_key like pi.name_key || '%'
          or pi.name_key like pi.city_key || '%'
        )
        and (
          pi.city_key like '%golf%'
          or pi.name_key like '%golf%'
          or pi.city_key like '%country club%'
          or pi.name_key like '%country club%'
        )
      )
      and not exists (
        select 1
        from normalized_parses np
        where np.id = pi.id
          and np.parse_source = 'golf_courses.city'
          and np.confidence = 'high'
      )
    ) as already_correct
  from parse_inputs pi
),
malformed as (
  select
    f.id,
    f.name,
    f.city,
    f.region,
    f.country,
    f.source_name,
    f.submitted_by_member,
    f.city_norm,
    f.name_norm,
    f.city_key,
    f.name_key,
    f.experience_count,
    f.round_locations,
    f.latest_round_location,
    f.region_missing,
    f.country_missing,
    f.country_not_normalized,
    f.city_blank,
    f.city_equals_name,
    f.city_similar_to_name,
    f.city_embeds_us_location,
    f.already_correct
  from flags f
  where not f.already_correct
    and (
      f.region_missing
      or f.country_missing
      or f.country_not_normalized
      or f.city_blank
      or f.city_equals_name
      or f.city_similar_to_name
      or f.city_embeds_us_location
    )
),
best_city_parse as (
  select distinct on (m.id)
    m.id,
    np.city as suggested_city,
    np.region as suggested_region,
    np.country as suggested_country,
    np.confidence as parse_confidence,
    np.parse_source
  from malformed m
  join normalized_parses np on np.id = m.id
  where np.parse_source = 'golf_courses.city'
    and np.confidence = 'high'
  order by m.id
),
best_round_parse as (
  select distinct on (arp.id)
    arp.id,
    arp.city as suggested_city,
    arp.region as suggested_region,
    arp.country as suggested_country,
    arp.confidence as parse_confidence,
    arp.parse_source
  from all_round_parses arp
  order by arp.id, arp.played_on desc nulls last, arp.created_at desc nulls last
),
audit_rows as (
  select
    m.id,
    m.name,
    m.city,
    m.region,
    m.country,
    m.source_name,
    m.submitted_by_member,
    m.round_locations as related_round_locations,
    m.experience_count,
    coalesce(
      case
        when m.city_equals_name or m.city_similar_to_name then brp.suggested_city
        else bcp.suggested_city
      end,
      brp.suggested_city
    ) as suggested_city,
    coalesce(
      case
        when m.city_equals_name or m.city_similar_to_name then brp.suggested_region
        else bcp.suggested_region
      end,
      brp.suggested_region
    ) as suggested_region,
    coalesce(
      case
        when m.city_equals_name or m.city_similar_to_name then brp.suggested_country
        else bcp.suggested_country
      end,
      brp.suggested_country
    ) as suggested_country,
    coalesce(
      case
        when m.city_equals_name or m.city_similar_to_name then brp.parse_confidence
        else bcp.parse_confidence
      end,
      brp.parse_confidence
    ) as parse_confidence,
    case
      when (m.city_equals_name or m.city_similar_to_name) and brp.suggested_city is not null then 'auto_update'
      when not (m.city_equals_name or m.city_similar_to_name) and bcp.suggested_city is not null then 'auto_update'
      when brp.suggested_city is not null then 'auto_update'
      else 'manual_review'
    end as cleanup_action,
    case
      when (m.city_equals_name or m.city_similar_to_name) and brp.suggested_city is null
        then 'City matches or resembles course name without a confidently parseable experience location.'
      when coalesce(
        case
          when m.city_equals_name or m.city_similar_to_name then brp.suggested_city
          else bcp.suggested_city
        end,
        brp.suggested_city
      ) is null
        then 'No confidently parseable city or experience location was found.'
      else null
    end as manual_review_reason
  from malformed m
  left join best_city_parse bcp on bcp.id = m.id
  left join best_round_parse brp on brp.id = m.id
)
select
  ar.id,
  ar.name,
  ar.city,
  ar.region,
  ar.country,
  ar.source_name,
  ar.submitted_by_member,
  ar.related_round_locations,
  ar.experience_count,
  ar.suggested_city,
  ar.suggested_region,
  ar.suggested_country,
  ar.parse_confidence,
  ar.cleanup_action,
  ar.manual_review_reason
from audit_rows ar
order by
  case ar.cleanup_action when 'manual_review' then 1 else 0 end,
  ar.name asc;

-- ---------------------------------------------------------------------------
-- Focus list: known audit + additional legacy clubs
-- ---------------------------------------------------------------------------
with member_courses as (
  select
    gc.id,
    gc.name,
    gc.city,
    gc.region,
    gc.country,
    gc.source_name,
    gc.submitted_by_member
  from public.golf_courses gc
  where gc.moderation_status = 'active'
    and (gc.submitted_by_member is true or gc.source_name = 'member_submitted')
)
select
  'focus club present in library' as note,
  mc.id,
  mc.name,
  mc.city,
  mc.region,
  mc.country,
  mc.source_name,
  mc.submitted_by_member
from member_courses mc
where mc.name ilike any (array[
  '%Kinloch Golf Club%',
  '%Sebonack Golf Club%',
  '%Seminole Golf Club%',
  '%Southampton Golf Club%',
  '%Westhampton%',
  '%Shinnecock Hills Golf Club%'
])
order by mc.name asc;
