-- Staged golf course import pipeline: service-role RPCs for batch staging,
-- duplicate detection, draft inserts, and safe provider-owned updates.
-- Does not connect external providers — run via scripts/import-golf-courses.mjs.

-- ---------------------------------------------------------------------------
-- 1. Batch counters
-- ---------------------------------------------------------------------------

alter table public.course_import_batches
  add column if not exists processed_count integer not null default 0,
  add column if not exists success_count integer not null default 0;

-- ---------------------------------------------------------------------------
-- 2. Country normalization (shared with client/script helpers)
-- ---------------------------------------------------------------------------

create or replace function public.normalize_golf_course_country(p_country text)
returns text
language plpgsql
immutable
as $$
declare
  v_key text;
begin
  v_key := lower(trim(coalesce(p_country, '')));
  if v_key = '' then
    return null;
  end if;

  return case v_key
    when 'us' then 'United States'
    when 'usa' then 'United States'
    when 'u.s.' then 'United States'
    when 'u.s.a.' then 'United States'
    when 'united states of america' then 'United States'
    when 'uk' then 'United Kingdom'
    when 'u.k.' then 'United Kingdom'
    when 'gb' then 'United Kingdom'
    when 'great britain' then 'United Kingdom'
    when 'england' then 'United Kingdom'
    when 'scotland' then 'United Kingdom'
    when 'wales' then 'United Kingdom'
    when 'northern ireland' then 'United Kingdom'
    when 'ca' then 'Canada'
    when 'can' then 'Canada'
    when 'au' then 'Australia'
    when 'aus' then 'Australia'
    when 'nz' then 'New Zealand'
    when 'ie' then 'Ireland'
    when 'irl' then 'Ireland'
    when 'za' then 'South Africa'
    when 'ae' then 'United Arab Emirates'
  else trim(p_country)
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Service import batch lifecycle
-- ---------------------------------------------------------------------------

create or replace function public.service_import_create_course_batch(
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
  if char_length(trim(coalesce(p_source_name, ''))) = 0 then
    raise exception 'source_name is required.';
  end if;

  insert into public.course_import_batches (
    source_name,
    source_label,
    notes,
    status
  )
  values (
    trim(p_source_name),
    nullif(trim(coalesce(p_source_label, '')), ''),
    nullif(trim(coalesce(p_notes, '')), ''),
    'pending'
  )
  returning * into v_batch;

  return v_batch;
end;
$$;

revoke all on function public.service_import_create_course_batch(text, text, text) from public;
grant execute on function public.service_import_create_course_batch(text, text, text) to service_role;

create or replace function public.service_import_begin_course_batch(p_batch_id uuid)
returns public.course_import_batches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch public.course_import_batches;
begin
  update public.course_import_batches b
  set
    status = 'processing',
    started_at = coalesce(b.started_at, now()),
    updated_at = now()
  where b.id = p_batch_id
  returning * into v_batch;

  if v_batch.id is null then
    raise exception 'Import batch not found.';
  end if;

  return v_batch;
end;
$$;

revoke all on function public.service_import_begin_course_batch(uuid) from public;
grant execute on function public.service_import_begin_course_batch(uuid) to service_role;

create or replace function public.service_import_finalize_course_batch(
  p_batch_id uuid,
  p_status text default 'completed'
)
returns public.course_import_batches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch public.course_import_batches;
  v_status text;
begin
  v_status := coalesce(nullif(trim(p_status), ''), 'completed');
  if v_status not in ('completed', 'failed', 'cancelled') then
    raise exception 'Invalid batch final status: %', v_status;
  end if;

  update public.course_import_batches b
  set
    status = v_status,
    completed_at = now(),
    updated_at = now()
  where b.id = p_batch_id
  returning * into v_batch;

  if v_batch.id is null then
    raise exception 'Import batch not found.';
  end if;

  return v_batch;
end;
$$;

revoke all on function public.service_import_finalize_course_batch(uuid, text) from public;
grant execute on function public.service_import_finalize_course_batch(uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- 4. Stage import records (pending only — processing runs duplicate detection)
-- ---------------------------------------------------------------------------

create or replace function public.service_import_stage_course_record(
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
begin
  if not exists (select 1 from public.course_import_batches b where b.id = p_batch_id) then
    raise exception 'Import batch not found.';
  end if;

  if char_length(trim(coalesce(p_source_name, ''))) = 0 then
    raise exception 'source_name is required.';
  end if;

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
    'pending'
  )
  returning * into v_record;

  update public.course_import_batches b
  set
    total_records = b.total_records + 1,
    updated_at = now()
  where b.id = p_batch_id;

  return v_record;
end;
$$;

revoke all on function public.service_import_stage_course_record(uuid, text, text, text, text, text, text, jsonb) from public;
grant execute on function public.service_import_stage_course_record(uuid, text, text, text, text, text, text, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- 5. Process a staged record: validate, dedupe, insert draft or safe update
-- ---------------------------------------------------------------------------

create or replace function public.service_import_process_course_record(p_record_id uuid)
returns public.course_import_records
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record public.course_import_records;
  v_payload jsonb;
  v_external_id text;
  v_name text;
  v_city text;
  v_region text;
  v_country text;
  v_slug text;
  v_existing_id uuid;
  v_new_course_id uuid;
  v_candidates uuid[];
  v_outcome text;
begin
  select *
  into v_record
  from public.course_import_records r
  where r.id = p_record_id
  for update;

  if v_record.id is null then
    raise exception 'Import record not found.';
  end if;

  if v_record.status not in ('pending', 'validated') then
    return v_record;
  end if;

  v_payload := coalesce(v_record.raw_payload, '{}'::jsonb);
  v_external_id := nullif(trim(coalesce(v_record.external_id, '')), '');
  v_name := nullif(trim(coalesce(v_record.name, '')), '');
  v_city := nullif(trim(coalesce(v_record.city, '')), '');
  v_region := nullif(trim(coalesce(v_record.region, '')), '');
  v_country := public.normalize_golf_course_country(v_record.country);

  if v_external_id is null then
    update public.course_import_records r
    set
      status = 'error',
      error_message = 'external_id is required.',
      processed_at = now(),
      updated_at = now()
    where r.id = p_record_id
    returning * into v_record;

    update public.course_import_batches b
    set
      processed_count = b.processed_count + 1,
      error_count = b.error_count + 1,
      updated_at = now()
    where b.id = v_record.batch_id;

    return v_record;
  end if;

  if v_name is null then
    update public.course_import_records r
    set
      status = 'error',
      error_message = 'name is required.',
      processed_at = now(),
      updated_at = now()
    where r.id = p_record_id
    returning * into v_record;

    update public.course_import_batches b
    set
      processed_count = b.processed_count + 1,
      error_count = b.error_count + 1,
      updated_at = now()
    where b.id = v_record.batch_id;

    return v_record;
  end if;

  if v_country is null then
    update public.course_import_records r
    set
      status = 'error',
      error_message = 'country is required.',
      processed_at = now(),
      updated_at = now()
    where r.id = p_record_id
    returning * into v_record;

    update public.course_import_batches b
    set
      processed_count = b.processed_count + 1,
      error_count = b.error_count + 1,
      updated_at = now()
    where b.id = v_record.batch_id;

    return v_record;
  end if;

  update public.course_import_records r
  set
    name = v_name,
    city = v_city,
    region = v_region,
    country = v_country,
    normalized_name = public.normalize_golf_course_name(v_name),
    status = 'validated',
    updated_at = now()
  where r.id = p_record_id;

  select gc.id
  into v_existing_id
  from public.golf_courses gc
  where gc.external_id = v_external_id
  limit 1;

  select coalesce(array_agg(c.golf_course_id order by c.match_rank asc, c.golf_course_id asc), '{}'::uuid[])
  into v_candidates
  from public.find_golf_course_duplicate_candidates(
    v_external_id,
    v_name,
    v_city,
    v_country,
    null
  ) c;

  if v_existing_id is null and cardinality(v_candidates) > 0 then
    update public.course_import_records r
    set
      status = 'duplicate',
      duplicate_candidate_ids = v_candidates,
      matched_golf_course_id = v_candidates[1],
      error_message = null,
      processed_at = now(),
      updated_at = now()
    where r.id = p_record_id
    returning * into v_record;

    update public.course_import_batches b
    set
      processed_count = b.processed_count + 1,
      duplicate_count = b.duplicate_count + 1,
      updated_at = now()
    where b.id = v_record.batch_id;

    return v_record;
  end if;

  if v_existing_id is not null then
    update public.golf_courses gc
    set
      name = v_name,
      city = coalesce(v_city, gc.city),
      region = coalesce(v_region, gc.region),
      country = v_country,
      latitude = coalesce(nullif(v_payload->>'latitude', '')::numeric, gc.latitude),
      longitude = coalesce(nullif(v_payload->>'longitude', '')::numeric, gc.longitude),
      website_url = coalesce(nullif(trim(v_payload->>'website_url'), ''), gc.website_url),
      course_type = coalesce(nullif(trim(v_payload->>'course_type'), ''), gc.course_type),
      access_type = coalesce(nullif(trim(v_payload->>'access_type'), ''), gc.access_type),
      holes = coalesce(nullif(v_payload->>'holes', '')::integer, gc.holes),
      description = coalesce(nullif(trim(v_payload->>'description'), ''), gc.description),
      image_url = case
        when coalesce(gc.image_source, '') in ('admin', 'verified_rep') then gc.image_url
        else coalesce(nullif(trim(v_payload->>'image_url'), ''), gc.image_url)
      end,
      thumbnail_url = case
        when coalesce(gc.image_source, '') in ('admin', 'verified_rep') then gc.thumbnail_url
        else coalesce(nullif(trim(v_payload->>'thumbnail_url'), ''), gc.thumbnail_url)
      end,
      image_source = case
        when coalesce(gc.image_source, '') in ('admin', 'verified_rep') then gc.image_source
        else coalesce(nullif(trim(v_payload->>'image_source'), ''), gc.image_source)
      end,
      image_attribution = case
        when coalesce(gc.image_source, '') in ('admin', 'verified_rep') then gc.image_attribution
        else coalesce(nullif(trim(v_payload->>'image_attribution'), ''), gc.image_attribution)
      end,
      image_license = case
        when coalesce(gc.image_source, '') in ('admin', 'verified_rep') then gc.image_license
        else coalesce(nullif(trim(v_payload->>'image_license'), ''), gc.image_license)
      end,
      image_updated_at = case
        when coalesce(gc.image_source, '') in ('admin', 'verified_rep') then gc.image_updated_at
        when nullif(trim(v_payload->>'image_url'), '') is not null
          then coalesce(nullif(v_payload->>'image_updated_at', '')::timestamptz, now())
        else gc.image_updated_at
      end,
      source_name = coalesce(nullif(trim(v_record.source_name), ''), gc.source_name),
      source_updated_at = coalesce(nullif(v_payload->>'source_updated_at', '')::timestamptz, now()),
      updated_at = now()
    where gc.id = v_existing_id;

    update public.course_import_records r
    set
      status = 'updated',
      resulting_golf_course_id = v_existing_id,
      matched_golf_course_id = v_existing_id,
      duplicate_candidate_ids = '{}',
      processed_at = now(),
      updated_at = now()
    where r.id = p_record_id
    returning * into v_record;

    v_outcome := 'updated';
  else
    v_slug := nullif(trim(coalesce(v_payload->>'slug', '')), '');
    if v_slug is null then
      v_slug := public.generate_unique_golf_course_slug(v_name, v_city, v_region);
    elsif exists (select 1 from public.golf_courses gc where gc.slug = v_slug) then
      v_slug := public.generate_unique_golf_course_slug(v_name, v_city, v_region);
    end if;

    insert into public.golf_courses (
      external_id,
      name,
      slug,
      city,
      region,
      country,
      latitude,
      longitude,
      website_url,
      course_type,
      access_type,
      holes,
      description,
      image_url,
      thumbnail_url,
      image_source,
      image_attribution,
      image_license,
      image_updated_at,
      source_name,
      source_updated_at,
      lifecycle_status
    )
    values (
      v_external_id,
      v_name,
      v_slug,
      v_city,
      v_region,
      v_country,
      nullif(v_payload->>'latitude', '')::numeric,
      nullif(v_payload->>'longitude', '')::numeric,
      nullif(trim(v_payload->>'website_url'), ''),
      nullif(trim(v_payload->>'course_type'), ''),
      nullif(trim(v_payload->>'access_type'), ''),
      nullif(v_payload->>'holes', '')::integer,
      nullif(trim(v_payload->>'description'), ''),
      nullif(trim(v_payload->>'image_url'), ''),
      nullif(trim(v_payload->>'thumbnail_url'), ''),
      nullif(trim(v_payload->>'image_source'), ''),
      nullif(trim(v_payload->>'image_attribution'), ''),
      nullif(trim(v_payload->>'image_license'), ''),
      nullif(v_payload->>'image_updated_at', '')::timestamptz,
      coalesce(nullif(trim(v_record.source_name), ''), 'external_provider'),
      coalesce(nullif(v_payload->>'source_updated_at', '')::timestamptz, now()),
      'draft'
    )
    returning id into v_new_course_id;

    update public.course_import_records r
    set
      status = 'inserted',
      resulting_golf_course_id = v_new_course_id,
      duplicate_candidate_ids = '{}',
      processed_at = now(),
      updated_at = now()
    where r.id = p_record_id
    returning * into v_record;

    v_outcome := 'inserted';
  end if;

  update public.course_import_batches b
  set
    processed_count = b.processed_count + 1,
    success_count = b.success_count + 1,
    inserted_count = b.inserted_count + case when v_outcome = 'inserted' then 1 else 0 end,
    updated_count = b.updated_count + case when v_outcome = 'updated' then 1 else 0 end,
    updated_at = now()
  where b.id = v_record.batch_id;

  return v_record;
end;
$$;

revoke all on function public.service_import_process_course_record(uuid) from public;
grant execute on function public.service_import_process_course_record(uuid) to service_role;
