-- Golf course import foundation: lifecycle states, enrichment fields, import tracking,
-- and duplicate candidate detection. Does not import external courses.
-- Safe to re-run where noted with IF NOT EXISTS / OR REPLACE.

-- ---------------------------------------------------------------------------
-- 1. Lifecycle status on golf_courses
-- ---------------------------------------------------------------------------

alter table public.golf_courses
  add column if not exists lifecycle_status text;

update public.golf_courses
set lifecycle_status = case coalesce(moderation_status, 'active')
  when 'active' then 'published'
  when 'pending' then 'pending_review'
  when 'hidden' then 'hidden'
  else 'published'
end
where lifecycle_status is null;

alter table public.golf_courses
  alter column lifecycle_status set default 'published';

alter table public.golf_courses
  alter column lifecycle_status set not null;

alter table public.golf_courses
  drop constraint if exists golf_courses_lifecycle_status_check;

alter table public.golf_courses
  add constraint golf_courses_lifecycle_status_check
  check (lifecycle_status in ('draft', 'pending_review', 'published', 'hidden'));

create index if not exists golf_courses_lifecycle_status_idx
  on public.golf_courses (lifecycle_status);

-- ---------------------------------------------------------------------------
-- 2. AI enrichment fields (all nullable / optional defaults)
-- ---------------------------------------------------------------------------

alter table public.golf_courses
  add column if not exists aliases text[] not null default '{}',
  add column if not exists architect text,
  add column if not exists year_opened integer,
  add column if not exists course_style text,
  add column if not exists editorial_summary text,
  add column if not exists enrichment_status text,
  add column if not exists enrichment_version text;

alter table public.golf_courses
  drop constraint if exists golf_courses_year_opened_check;

alter table public.golf_courses
  add constraint golf_courses_year_opened_check
  check (year_opened is null or (year_opened >= 1500 and year_opened <= 2100));

alter table public.golf_courses
  drop constraint if exists golf_courses_enrichment_status_check;

alter table public.golf_courses
  add constraint golf_courses_enrichment_status_check
  check (
    enrichment_status is null
    or enrichment_status in ('pending', 'processing', 'completed', 'failed', 'needs_review')
  );

-- ---------------------------------------------------------------------------
-- 3. Normalized name for duplicate matching
-- ---------------------------------------------------------------------------

alter table public.golf_courses
  add column if not exists normalized_name text;

update public.golf_courses
set normalized_name = public.normalize_golf_course_name(name)
where normalized_name is null
  or normalized_name = '';

create index if not exists golf_courses_normalized_name_idx
  on public.golf_courses (normalized_name);

create index if not exists golf_courses_normalized_location_idx
  on public.golf_courses (
    normalized_name,
    lower(trim(coalesce(city, ''))),
    lower(trim(coalesce(country, '')))
  );

create or replace function public.golf_courses_set_normalized_name()
returns trigger
language plpgsql
as $$
begin
  new.normalized_name := public.normalize_golf_course_name(new.name);
  return new;
end;
$$;

drop trigger if exists golf_courses_set_normalized_name_trg on public.golf_courses;

create trigger golf_courses_set_normalized_name_trg
  before insert or update of name
  on public.golf_courses
  for each row
  execute function public.golf_courses_set_normalized_name();

create or replace function public.golf_courses_sync_moderation_status()
returns trigger
language plpgsql
as $$
begin
  new.moderation_status := case new.lifecycle_status
    when 'published' then 'active'
    when 'pending_review' then 'pending'
    when 'hidden' then 'hidden'
    when 'draft' then 'pending'
    else 'active'
  end;
  return new;
end;
$$;

drop trigger if exists golf_courses_sync_moderation_status_trg on public.golf_courses;

create trigger golf_courses_sync_moderation_status_trg
  before insert or update of lifecycle_status
  on public.golf_courses
  for each row
  execute function public.golf_courses_sync_moderation_status();

-- Backfill moderation_status for any rows touched only via lifecycle_status migration.
update public.golf_courses
set moderation_status = case lifecycle_status
  when 'published' then 'active'
  when 'pending_review' then 'pending'
  when 'hidden' then 'hidden'
  when 'draft' then 'pending'
  else 'active'
end
where moderation_status is distinct from case lifecycle_status
  when 'published' then 'active'
  when 'pending_review' then 'pending'
  when 'hidden' then 'hidden'
  when 'draft' then 'pending'
  else 'active'
end;

-- ---------------------------------------------------------------------------
-- 4. Import batch + record tables (admin-only)
-- ---------------------------------------------------------------------------

create table if not exists public.course_import_batches (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  source_label text,
  status text not null default 'pending',
  started_at timestamptz,
  completed_at timestamptz,
  created_by_email text,
  total_records integer not null default 0,
  inserted_count integer not null default 0,
  updated_count integer not null default 0,
  skipped_count integer not null default 0,
  duplicate_count integer not null default 0,
  error_count integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_import_batches_source_name_check check (char_length(trim(source_name)) > 0),
  constraint course_import_batches_status_check check (
    status in ('pending', 'processing', 'completed', 'failed', 'cancelled')
  )
);

create index if not exists course_import_batches_status_idx
  on public.course_import_batches (status, created_at desc);

create table if not exists public.course_import_records (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.course_import_batches (id) on delete cascade,
  external_id text,
  source_name text not null,
  status text not null default 'pending',
  raw_payload jsonb not null default '{}'::jsonb,
  normalized_name text,
  name text,
  city text,
  region text,
  country text,
  duplicate_candidate_ids uuid[] not null default '{}',
  matched_golf_course_id uuid references public.golf_courses (id) on delete set null,
  resulting_golf_course_id uuid references public.golf_courses (id) on delete set null,
  error_message text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_import_records_source_name_check check (char_length(trim(source_name)) > 0),
  constraint course_import_records_status_check check (
    status in ('pending', 'validated', 'duplicate', 'inserted', 'updated', 'skipped', 'error')
  )
);

create index if not exists course_import_records_batch_id_idx
  on public.course_import_records (batch_id, created_at asc);

create index if not exists course_import_records_external_id_idx
  on public.course_import_records (external_id)
  where external_id is not null;

create index if not exists course_import_records_status_idx
  on public.course_import_records (status);

alter table public.course_import_batches enable row level security;
alter table public.course_import_records enable row level security;

drop policy if exists "Admins can manage course import batches" on public.course_import_batches;
drop policy if exists "Admins can manage course import records" on public.course_import_records;

create policy "Admins can manage course import batches"
  on public.course_import_batches
  for all
  to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

create policy "Admins can manage course import records"
  on public.course_import_records
  for all
  to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

grant select, insert, update, delete on public.course_import_batches to authenticated;
grant select, insert, update, delete on public.course_import_records to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Duplicate candidate detection (no automatic deletes/merges)
-- ---------------------------------------------------------------------------

create or replace function public.find_golf_course_duplicate_candidates(
  p_external_id text default null,
  p_name text default null,
  p_city text default null,
  p_country text default null,
  p_exclude_course_id uuid default null
)
returns table (
  golf_course_id uuid,
  match_reason text,
  match_rank integer
)
language sql
stable
security definer
set search_path = public
as $$
  with input as (
    select
      nullif(trim(coalesce(p_external_id, '')), '') as external_id,
      public.normalize_golf_course_name(p_name) as normalized_name,
      nullif(lower(trim(coalesce(p_city, ''))), '') as city_key,
      nullif(lower(trim(coalesce(p_country, ''))), '') as country_key
  )
  select
    gc.id as golf_course_id,
    matches.match_reason,
    matches.match_rank
  from public.golf_courses gc
  cross join input i
  cross join lateral (
    select
      case
        when i.external_id is not null and gc.external_id = i.external_id then 'external_id'
        when i.normalized_name <> ''
          and gc.normalized_name = i.normalized_name
          and i.city_key is not null
          and lower(trim(coalesce(gc.city, ''))) = i.city_key
          and i.country_key is not null
          and lower(trim(coalesce(gc.country, ''))) = i.country_key
          then 'normalized_name_city_country'
        when i.normalized_name <> ''
          and gc.normalized_name = i.normalized_name
          and i.country_key is not null
          and lower(trim(coalesce(gc.country, ''))) = i.country_key
          then 'normalized_name_country'
      end as match_reason,
      case
        when i.external_id is not null and gc.external_id = i.external_id then 1
        when i.normalized_name <> ''
          and gc.normalized_name = i.normalized_name
          and i.city_key is not null
          and lower(trim(coalesce(gc.city, ''))) = i.city_key
          and i.country_key is not null
          and lower(trim(coalesce(gc.country, ''))) = i.country_key
          then 2
        when i.normalized_name <> ''
          and gc.normalized_name = i.normalized_name
          and i.country_key is not null
          and lower(trim(coalesce(gc.country, ''))) = i.country_key
          then 3
      end as match_rank
  ) matches
  where (p_exclude_course_id is null or gc.id <> p_exclude_course_id)
    and matches.match_reason is not null
  order by matches.match_rank asc, gc.name asc;
$$;

revoke all on function public.find_golf_course_duplicate_candidates(text, text, text, text, uuid) from public;
grant execute on function public.find_golf_course_duplicate_candidates(text, text, text, text, uuid) to authenticated;

create or replace function public.admin_find_golf_course_duplicate_candidates(
  p_external_id text default null,
  p_name text default null,
  p_city text default null,
  p_country text default null,
  p_exclude_course_id uuid default null
)
returns table (
  golf_course_id uuid,
  match_reason text,
  match_rank integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_user_is_admin() then
    raise exception 'Admin access is required.';
  end if;

  return query
  select *
  from public.find_golf_course_duplicate_candidates(
    p_external_id,
    p_name,
    p_city,
    p_country,
    p_exclude_course_id
  );
end;
$$;

revoke all on function public.admin_find_golf_course_duplicate_candidates(text, text, text, text, uuid) from public;
grant execute on function public.admin_find_golf_course_duplicate_candidates(text, text, text, text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Admin import RPCs (foundation — no external import execution yet)
-- ---------------------------------------------------------------------------

create or replace function public.admin_create_course_import_batch(
  p_source_name text,
  p_source_label text default null,
  p_notes text default null
)
returns public.course_import_batches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch public.course_import_batches;
begin
  if not public.current_user_is_admin() then
    raise exception 'Admin access is required.';
  end if;

  if char_length(trim(coalesce(p_source_name, ''))) = 0 then
    raise exception 'source_name is required.';
  end if;

  insert into public.course_import_batches (
    source_name,
    source_label,
    notes,
    created_by_email,
    status
  )
  values (
    trim(p_source_name),
    nullif(trim(coalesce(p_source_label, '')), ''),
    nullif(trim(coalesce(p_notes, '')), ''),
    lower(auth.jwt() ->> 'email'),
    'pending'
  )
  returning * into v_batch;

  return v_batch;
end;
$$;

revoke all on function public.admin_create_course_import_batch(text, text, text) from public;
grant execute on function public.admin_create_course_import_batch(text, text, text) to authenticated;

create or replace function public.admin_add_course_import_record(
  p_batch_id uuid,
  p_source_name text,
  p_external_id text default null,
  p_name text default null,
  p_city text default null,
  p_region text default null,
  p_country text default null,
  p_raw_payload jsonb default '{}'::jsonb
)
returns public.course_import_records
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record public.course_import_records;
  v_candidates uuid[];
begin
  if not public.current_user_is_admin() then
    raise exception 'Admin access is required.';
  end if;

  if not exists (select 1 from public.course_import_batches b where b.id = p_batch_id) then
    raise exception 'Import batch not found.';
  end if;

  if char_length(trim(coalesce(p_source_name, ''))) = 0 then
    raise exception 'source_name is required.';
  end if;

  select coalesce(array_agg(c.golf_course_id), '{}'::uuid[])
  into v_candidates
  from public.find_golf_course_duplicate_candidates(
    p_external_id,
    p_name,
    p_city,
    p_country,
    null
  ) c;

  insert into public.course_import_records (
    batch_id,
    external_id,
    source_name,
    raw_payload,
    normalized_name,
    name,
    city,
    region,
    country,
    duplicate_candidate_ids,
    matched_golf_course_id,
    status
  )
  values (
    p_batch_id,
    nullif(trim(coalesce(p_external_id, '')), ''),
    trim(p_source_name),
    coalesce(p_raw_payload, '{}'::jsonb),
    public.normalize_golf_course_name(p_name),
    nullif(trim(coalesce(p_name, '')), ''),
    nullif(trim(coalesce(p_city, '')), ''),
    nullif(trim(coalesce(p_region, '')), ''),
    nullif(trim(coalesce(p_country, '')), ''),
    v_candidates,
    case when cardinality(v_candidates) > 0 then v_candidates[1] else null end,
    case when cardinality(v_candidates) > 0 then 'duplicate' else 'pending' end
  )
  returning * into v_record;

  update public.course_import_batches b
  set
    total_records = b.total_records + 1,
    duplicate_count = b.duplicate_count + case when cardinality(v_candidates) > 0 then 1 else 0 end,
    updated_at = now()
  where b.id = p_batch_id;

  return v_record;
end;
$$;

revoke all on function public.admin_add_course_import_record(uuid, text, text, text, text, text, text, jsonb) from public;
grant execute on function public.admin_add_course_import_record(uuid, text, text, text, text, text, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Member course creation uses published lifecycle
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
    lifecycle_status,
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
    'published',
    now(),
    true
  )
  returning id, slug into golf_course_id, slug;

  created_new := true;
  return next;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Portal directory RPCs — only published courses (replaces moderation_status filter)
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
      gc.lifecycle_status = 'published'
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
  where (
  gc.lifecycle_status = 'published'
  or gc.source_name = 'elitetee_curated'
)
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
    and gc.lifecycle_status = 'published'
  limit 1;
$$;

revoke all on function public.get_golf_course_by_slug(text) from public;
grant execute on function public.get_golf_course_by_slug(text) to authenticated;
