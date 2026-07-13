-- One-time cleanup for legacy member-submitted golf course structured locations.
-- Self-contained: paste this entire file into a blank Supabase SQL Editor tab.
-- Run manually after reviewing: supabase/scripts/audit_legacy_member_course_locations.sql
-- Safe to re-run: only updates malformed member-submitted rows with high-confidence parses.
-- Does NOT modify provider-owned, seed-owned, or EliteTee-owned canonical courses.
-- Does NOT rewrite member_course_rounds, feed posts, photos, ratings, or played dates.

-- Drop legacy signatures from earlier drafts (no-op if absent).
drop function if exists public.propose_legacy_member_course_location_fix(text, text, text, text, text);
drop function if exists public.propose_legacy_member_course_location_fix(uuid, text, text, text, text);
drop function if exists public.best_parseable_round_location(uuid);
drop function if exists public.has_correct_member_submitted_location(text, text, text, text);
drop function if exists public.is_course_name_used_as_city(text, text);
drop function if exists public.is_course_city_equal_or_similar_to_name(text, text);
drop function if exists public.parse_legacy_us_course_location(text);
drop function if exists public.is_legacy_member_submitted_golf_course(boolean, text);
drop function if exists public.normalize_us_country_label(text);
drop function if exists public.normalize_location_whitespace(text);

-- ---------------------------------------------------------------------------
-- Helpers (dependency order: each function is defined before first reference)
-- ---------------------------------------------------------------------------

-- 1. normalize_location_whitespace
create or replace function public.normalize_location_whitespace(p_text text)
returns text
language sql
immutable
as $$
  select trim(regexp_replace(coalesce(p_text, ''), '\s+', ' ', 'g'));
$$;

-- 2. normalize_us_country_label -> normalize_location_whitespace
create or replace function public.normalize_us_country_label(p_country text)
returns text
language sql
immutable
as $$
  select case
    when public.normalize_location_whitespace(p_country) = '' then ''
    when lower(public.normalize_location_whitespace(p_country)) in (
      'us', 'usa', 'u.s.', 'u.s.a.', 'united states', 'united states of america'
    ) then 'United States'
    else public.normalize_location_whitespace(p_country)
  end;
$$;

-- 3. is_legacy_member_submitted_golf_course
create or replace function public.is_legacy_member_submitted_golf_course(
  p_submitted_by_member boolean,
  p_source_name text
)
returns boolean
language sql
immutable
as $$
  select coalesce(p_submitted_by_member, false) is true
    or coalesce(p_source_name, '') = 'member_submitted';
$$;

-- 4. parse_legacy_us_course_location -> normalize_location_whitespace
create or replace function public.parse_legacy_us_course_location(p_input text)
returns table (
  city text,
  region text,
  country text,
  confidence text,
  parse_source text
)
language plpgsql
immutable
as $$
declare
  v_raw text;
  v_parts text[];
  v_part_count integer;
  v_last_token text;
  v_state record;
  v_city text;
  v_region text;
begin
  city := '';
  region := '';
  country := '';
  confidence := 'low';
  parse_source := 'empty';

  v_raw := public.normalize_location_whitespace(p_input);
  if v_raw = '' then
    return next;
    return;
  end if;

  select coalesce(array_agg(trim(part)), array[]::text[])
  into v_parts
  from unnest(string_to_array(v_raw, ',')) as part
  where trim(part) <> '';

  v_part_count := coalesce(array_length(v_parts, 1), 0);

  if v_part_count >= 2 then
    city := v_parts[1];
    v_region := v_parts[2];
    if length(v_region) = 2 then
      region := upper(v_region);
    else
      select s.full_name
      into region
      from (
        values
          ('AL', 'Alabama'), ('AK', 'Alaska'), ('AZ', 'Arizona'), ('AR', 'Arkansas'),
          ('CA', 'California'), ('CO', 'Colorado'), ('CT', 'Connecticut'), ('DE', 'Delaware'),
          ('FL', 'Florida'), ('GA', 'Georgia'), ('HI', 'Hawaii'), ('ID', 'Idaho'),
          ('IL', 'Illinois'), ('IN', 'Indiana'), ('IA', 'Iowa'), ('KS', 'Kansas'),
          ('KY', 'Kentucky'), ('LA', 'Louisiana'), ('ME', 'Maine'), ('MD', 'Maryland'),
          ('MA', 'Massachusetts'), ('MI', 'Michigan'), ('MN', 'Minnesota'), ('MS', 'Mississippi'),
          ('MO', 'Missouri'), ('MT', 'Montana'), ('NE', 'Nebraska'), ('NV', 'Nevada'),
          ('NH', 'New Hampshire'), ('NJ', 'New Jersey'), ('NM', 'New Mexico'), ('NY', 'New York'),
          ('NC', 'North Carolina'), ('ND', 'North Dakota'), ('OH', 'Ohio'), ('OK', 'Oklahoma'),
          ('OR', 'Oregon'), ('PA', 'Pennsylvania'), ('RI', 'Rhode Island'), ('SC', 'South Carolina'),
          ('SD', 'South Dakota'), ('TN', 'Tennessee'), ('TX', 'Texas'), ('UT', 'Utah'),
          ('VT', 'Vermont'), ('VA', 'Virginia'), ('WA', 'Washington'), ('WV', 'West Virginia'),
          ('WI', 'Wisconsin'), ('WY', 'Wyoming'), ('DC', 'District of Columbia')
      ) as s(abbrev, full_name)
      where lower(s.full_name) = lower(v_region)
      limit 1;

      if region is null then
        region := initcap(v_region);
      end if;
    end if;

    country := 'United States';
    confidence := 'high';
    parse_source := 'comma';
    return next;
    return;
  end if;

  v_last_token := (regexp_match(v_raw, '\s+([A-Za-z]{2})$'))[1];
  if v_last_token is not null then
    select s.abbrev
    into region
    from (
      values
        ('AL', 'Alabama'), ('AK', 'Alaska'), ('AZ', 'Arizona'), ('AR', 'Arkansas'),
        ('CA', 'California'), ('CO', 'Colorado'), ('CT', 'Connecticut'), ('DE', 'Delaware'),
        ('FL', 'Florida'), ('GA', 'Georgia'), ('HI', 'Hawaii'), ('ID', 'Idaho'),
        ('IL', 'Illinois'), ('IN', 'Indiana'), ('IA', 'Iowa'), ('KS', 'Kansas'),
        ('KY', 'Kentucky'), ('LA', 'Louisiana'), ('ME', 'Maine'), ('MD', 'Maryland'),
        ('MA', 'Massachusetts'), ('MI', 'Michigan'), ('MN', 'Minnesota'), ('MS', 'Mississippi'),
        ('MO', 'Missouri'), ('MT', 'Montana'), ('NE', 'Nebraska'), ('NV', 'Nevada'),
        ('NH', 'New Hampshire'), ('NJ', 'New Jersey'), ('NM', 'New Mexico'), ('NY', 'New York'),
        ('NC', 'North Carolina'), ('ND', 'North Dakota'), ('OH', 'Ohio'), ('OK', 'Oklahoma'),
        ('OR', 'Oregon'), ('PA', 'Pennsylvania'), ('RI', 'Rhode Island'), ('SC', 'South Carolina'),
        ('SD', 'South Dakota'), ('TN', 'Tennessee'), ('TX', 'Texas'), ('UT', 'Utah'),
        ('VT', 'Vermont'), ('VA', 'Virginia'), ('WA', 'Washington'), ('WV', 'West Virginia'),
        ('WI', 'Wisconsin'), ('WY', 'Wyoming'), ('DC', 'District of Columbia')
    ) as s(abbrev, full_name)
    where s.abbrev = upper(v_last_token)
    limit 1;

    if region is not null then
      city := trim(regexp_replace(v_raw, '\s+[A-Za-z]{2}$', ''));
      country := 'United States';
      confidence := 'high';
      parse_source := 'us_suffix';
      return next;
      return;
    end if;
  end if;

  for v_state in
    select full_name
    from (
      values
        ('District of Columbia'),
        ('New Hampshire'), ('New Jersey'), ('New Mexico'), ('New York'),
        ('North Carolina'), ('North Dakota'), ('Rhode Island'), ('South Carolina'),
        ('South Dakota'), ('West Virginia'),
        ('Alabama'), ('Alaska'), ('Arizona'), ('Arkansas'), ('California'), ('Colorado'),
        ('Connecticut'), ('Delaware'), ('Florida'), ('Georgia'), ('Hawaii'), ('Idaho'),
        ('Illinois'), ('Indiana'), ('Iowa'), ('Kansas'), ('Kentucky'), ('Louisiana'),
        ('Maine'), ('Maryland'), ('Massachusetts'), ('Michigan'), ('Minnesota'),
        ('Mississippi'), ('Missouri'), ('Montana'), ('Nebraska'), ('Nevada'), ('Ohio'),
        ('Oklahoma'), ('Oregon'), ('Pennsylvania'), ('Tennessee'), ('Texas'), ('Utah'),
        ('Vermont'), ('Virginia'), ('Washington'), ('Wisconsin'), ('Wyoming')
    ) as t(full_name)
    order by length(full_name) desc
  loop
    if right(lower(v_raw), length(v_state.full_name)) = lower(v_state.full_name) then
      v_city := trim(left(v_raw, length(v_raw) - length(v_state.full_name)));
      if v_city <> '' then
        city := v_city;
        region := v_state.full_name;
        country := 'United States';
        confidence := case when length(v_state.full_name) > 12 then 'medium' else 'high' end;
        parse_source := 'us_suffix';
        return next;
        return;
      end if;
    end if;
  end loop;

  city := v_raw;
  region := '';
  country := '';
  confidence := 'low';
  parse_source := 'empty';
  return next;
end;
$$;

-- 5. is_course_city_equal_or_similar_to_name -> normalize_location_whitespace
create or replace function public.is_course_city_equal_or_similar_to_name(
  p_name text,
  p_city text
)
returns boolean
language sql
immutable
as $$
  with normalized as (
    select
      lower(public.normalize_location_whitespace(p_name)) as name_key,
      lower(public.normalize_location_whitespace(p_city)) as city_key
  )
  select
    n.city_key <> ''
    and (
      n.city_key = n.name_key
      or (
        n.city_key <> n.name_key
        and (n.city_key like n.name_key || '%' or n.name_key like n.city_key || '%')
        and (
          n.city_key like '%golf%'
          or n.name_key like '%golf%'
          or n.city_key like '%country club%'
          or n.name_key like '%country club%'
        )
      )
    )
  from normalized n;
$$;

-- 6. is_course_name_used_as_city -> is_course_city_equal_or_similar_to_name, parse_legacy_us_course_location
create or replace function public.is_course_name_used_as_city(
  p_name text,
  p_city text
)
returns boolean
language sql
immutable
as $$
  select public.is_course_city_equal_or_similar_to_name(p_name, p_city)
    and not exists (
      select 1
      from public.parse_legacy_us_course_location(p_city) pl
      where pl.confidence = 'high'
        and coalesce(pl.region, '') <> ''
        and coalesce(pl.country, '') <> ''
    );
$$;

-- 7. has_correct_member_submitted_location -> parse_legacy_us_course_location, normalize_*, is_course_city_equal_or_similar_to_name
create or replace function public.has_correct_member_submitted_location(
  p_name text,
  p_city text,
  p_region text,
  p_country text
)
returns boolean
language sql
immutable
as $$
  with parsed_city as (
    select pl.*
    from public.parse_legacy_us_course_location(p_city) pl
  )
  select
    public.normalize_location_whitespace(coalesce(p_city, '')) <> ''
    and public.normalize_location_whitespace(coalesce(p_region, '')) <> ''
    and public.normalize_us_country_label(p_country) = 'United States'
    and not public.is_course_city_equal_or_similar_to_name(p_name, p_city)
    and not exists (
      select 1
      from parsed_city pc
      where pc.confidence = 'high'
        and coalesce(pc.region, '') <> ''
    );
$$;

-- 8. best_parseable_round_location -> parse_legacy_us_course_location, normalize_location_whitespace, member_course_rounds
create or replace function public.best_parseable_round_location(p_golf_course_id uuid)
returns text
language sql
stable
set search_path = public
as $$
  select nullif(public.normalize_location_whitespace(mcr.location), '')
  from public.member_course_rounds mcr
  cross join lateral public.parse_legacy_us_course_location(
    nullif(public.normalize_location_whitespace(mcr.location), '')
  ) pl
  where mcr.golf_course_id = p_golf_course_id
    and nullif(public.normalize_location_whitespace(mcr.location), '') is not null
    and pl.confidence = 'high'
    and coalesce(pl.region, '') <> ''
    and coalesce(pl.country, '') <> ''
  order by mcr.played_on desc nulls last, mcr.created_at desc nulls last
  limit 1;
$$;

-- 9. propose_legacy_member_course_location_fix -> all helpers above
create or replace function public.propose_legacy_member_course_location_fix(
  p_golf_course_id uuid,
  p_name text,
  p_city text,
  p_region text,
  p_country text
)
returns table (
  new_city text,
  new_region text,
  new_country text,
  parse_source text,
  parse_confidence text,
  cleanup_action text,
  reason_manual_review text
)
language plpgsql
stable
set search_path = public
as $$
declare
  v_city_parse record;
  v_round_parse record;
  v_city_is_course_name boolean;
  v_round_location text;
begin
  new_city := null;
  new_region := null;
  new_country := null;
  parse_source := 'none';
  parse_confidence := 'low';
  cleanup_action := 'manual_review';
  reason_manual_review := null;

  if public.has_correct_member_submitted_location(p_name, p_city, p_region, p_country) then
    cleanup_action := 'skip';
    return next;
    return;
  end if;

  select * into v_city_parse from public.parse_legacy_us_course_location(p_city);
  v_city_is_course_name := public.is_course_name_used_as_city(p_name, p_city);
  v_round_location := public.best_parseable_round_location(p_golf_course_id);
  select * into v_round_parse from public.parse_legacy_us_course_location(v_round_location);

  if v_city_is_course_name then
    if v_round_parse.confidence = 'high'
      and coalesce(v_round_parse.region, '') <> ''
      and coalesce(v_round_parse.country, '') <> '' then
      new_city := v_round_parse.city;
      new_region := v_round_parse.region;
      new_country := 'United States';
      parse_source := 'round_location';
      parse_confidence := v_round_parse.confidence;
      cleanup_action := 'auto_update';
      return next;
      return;
    end if;

    reason_manual_review :=
      'City matches or resembles course name without a confidently parseable experience location.';
    return next;
    return;
  end if;

  if v_city_parse.confidence = 'high'
    and coalesce(v_city_parse.region, '') <> ''
    and coalesce(v_city_parse.country, '') <> '' then
    new_city := v_city_parse.city;
    new_region := v_city_parse.region;
    new_country := 'United States';
    parse_source := 'golf_courses.city';
    parse_confidence := v_city_parse.confidence;
    cleanup_action := 'auto_update';
    return next;
    return;
  end if;

  if v_round_parse.confidence = 'high'
    and coalesce(v_round_parse.region, '') <> ''
    and coalesce(v_round_parse.country, '') <> '' then
    new_city := v_round_parse.city;
    new_region := v_round_parse.region;
    new_country := 'United States';
    parse_source := 'round_location';
    parse_confidence := v_round_parse.confidence;
    cleanup_action := 'auto_update';
    return next;
    return;
  end if;

  reason_manual_review := 'No confidently parseable city or experience location was found.';
  return next;
end;
$$;

revoke all on function public.normalize_location_whitespace(text) from public;
revoke all on function public.normalize_us_country_label(text) from public;
revoke all on function public.is_legacy_member_submitted_golf_course(boolean, text) from public;
revoke all on function public.parse_legacy_us_course_location(text) from public;
revoke all on function public.is_course_city_equal_or_similar_to_name(text, text) from public;
revoke all on function public.is_course_name_used_as_city(text, text) from public;
revoke all on function public.has_correct_member_submitted_location(text, text, text, text) from public;
revoke all on function public.best_parseable_round_location(uuid) from public;
revoke all on function public.propose_legacy_member_course_location_fix(uuid, text, text, text, text) from public;

-- ---------------------------------------------------------------------------
-- Preview proposed changes (shown in migration output; pre-update snapshot)
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
    and public.is_legacy_member_submitted_golf_course(gc.submitted_by_member, gc.source_name)
),
proposed as (
  select
    mc.id as course_id,
    mc.name as course_name,
    mc.city as old_city,
    mc.region as old_region,
    mc.country as old_country,
    fix.new_city,
    fix.new_region,
    fix.new_country,
    fix.parse_source,
    fix.parse_confidence,
    fix.cleanup_action,
    fix.reason_manual_review
  from member_courses mc
  cross join lateral public.propose_legacy_member_course_location_fix(
    mc.id,
    mc.name,
    mc.city,
    mc.region,
    mc.country
  ) fix
)
select
  '041 preview: proposed auto-updates' as section,
  course_id,
  course_name,
  old_city,
  old_region,
  old_country,
  new_city,
  new_region,
  new_country,
  parse_source,
  parse_confidence
from proposed
where cleanup_action = 'auto_update'
order by course_name asc;

-- ---------------------------------------------------------------------------
-- Apply one-time cleanup (golf_courses only, member-submitted rows)
-- ---------------------------------------------------------------------------

begin;

with member_courses as (
  select
    gc.id,
    gc.name,
    gc.city,
    gc.region,
    gc.country
  from public.golf_courses gc
  where gc.moderation_status = 'active'
    and public.is_legacy_member_submitted_golf_course(gc.submitted_by_member, gc.source_name)
),
proposed as (
  select
    mc.id as course_id,
    fix.new_city,
    fix.new_region,
    fix.new_country,
    fix.parse_source,
    fix.parse_confidence,
    fix.cleanup_action
  from member_courses mc
  cross join lateral public.propose_legacy_member_course_location_fix(
    mc.id,
    mc.name,
    mc.city,
    mc.region,
    mc.country
  ) fix
  where fix.cleanup_action = 'auto_update'
    and fix.new_city is not null
    and fix.new_region is not null
    and fix.new_country is not null
    and fix.parse_confidence = 'high'
)
update public.golf_courses gc
set
  city = p.new_city,
  region = p.new_region,
  country = p.new_country,
  updated_at = now()
from proposed p
where gc.id = p.course_id
  and public.is_legacy_member_submitted_golf_course(gc.submitted_by_member, gc.source_name)
  and not public.has_correct_member_submitted_location(gc.name, gc.city, gc.region, gc.country)
  and (
    public.normalize_location_whitespace(coalesce(gc.city, '')) is distinct from public.normalize_location_whitespace(p.new_city)
    or public.normalize_location_whitespace(coalesce(gc.region, '')) is distinct from public.normalize_location_whitespace(p.new_region)
    or public.normalize_us_country_label(coalesce(gc.country, '')) is distinct from public.normalize_us_country_label(p.new_country)
  );

commit;

-- ---------------------------------------------------------------------------
-- Post-update report + manual-review queue
-- ---------------------------------------------------------------------------

with member_courses as (
  select
    gc.id,
    gc.name,
    gc.city,
    gc.region,
    gc.country
  from public.golf_courses gc
  where gc.moderation_status = 'active'
    and public.is_legacy_member_submitted_golf_course(gc.submitted_by_member, gc.source_name)
),
status as (
  select
    mc.id,
    mc.name,
    mc.city,
    mc.region,
    mc.country,
    public.best_parseable_round_location(mc.id) as latest_round_location,
    fix.cleanup_action,
    fix.reason_manual_review
  from member_courses mc
  cross join lateral public.propose_legacy_member_course_location_fix(
    mc.id,
    mc.name,
    mc.city,
    mc.region,
    mc.country
  ) fix
)
select
  '041 manual review queue' as section,
  id,
  name,
  city,
  region,
  country,
  latest_round_location,
  reason_manual_review
from status
where cleanup_action = 'manual_review'
order by name asc;
