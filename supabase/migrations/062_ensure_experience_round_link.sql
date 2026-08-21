-- Repair orphan course-experience feed posts that are missing member_course_round_id.
-- Safe / idempotent:
--   - never duplicates a feed post
--   - never links to another member's round
--   - never alters curated golf_courses beyond find_or_create_member_golf_course_internal
--   - ambiguous round matches are left untouched and reported
-- Photo uploads do not require migration 060.

create or replace function public.parse_experience_feed_post_content(p_content text)
returns table (
  course_name text,
  location text,
  played_on date,
  course_rating numeric,
  would_play_again boolean,
  note text
)
language plpgsql
stable
set search_path = public
as $$
declare
  v_parsed jsonb;
  v_details jsonb;
  v_location text;
  v_played_raw text;
  v_rating_raw text;
  v_would_raw text;
  v_played date;
  v_rating numeric;
begin
  begin
    v_parsed := p_content::jsonb;
  exception
    when others then
      v_parsed := '{}'::jsonb;
  end;

  v_details := coalesce(v_parsed -> 'details', '[]'::jsonb);

  select nullif(trim(elem ->> 'value'), '')
  into v_location
  from jsonb_array_elements(v_details) elem
  where lower(coalesce(elem ->> 'label', '')) = 'location'
  limit 1;

  select nullif(trim(elem ->> 'value'), '')
  into v_played_raw
  from jsonb_array_elements(v_details) elem
  where lower(coalesce(elem ->> 'label', '')) in ('played', 'date played', 'played on')
  limit 1;

  select nullif(trim(elem ->> 'value'), '')
  into v_rating_raw
  from jsonb_array_elements(v_details) elem
  where lower(coalesce(elem ->> 'label', '')) in ('course rating', 'rating')
  limit 1;

  select nullif(trim(elem ->> 'value'), '')
  into v_would_raw
  from jsonb_array_elements(v_details) elem
  where lower(coalesce(elem ->> 'label', '')) = 'would play again'
  limit 1;

  v_played := null;
  if v_played_raw is not null then
    begin
      v_played := to_date(v_played_raw, 'Mon DD, YYYY');
    exception
      when others then
        begin
          v_played := v_played_raw::date;
        exception
          when others then
            v_played := null;
        end;
    end;
  end if;

  v_rating := null;
  if v_rating_raw is not null then
    begin
      v_rating := nullif(regexp_replace(v_rating_raw, '[^0-9\.]', '', 'g'), '')::numeric;
    exception
      when others then
        v_rating := null;
    end;
  end if;

  if v_rating is null and (v_parsed ? 'rating') then
    begin
      v_rating := (v_parsed ->> 'rating')::numeric;
    exception
      when others then
        v_rating := null;
    end;
  end if;

  course_name := coalesce(nullif(trim(v_parsed ->> 'headline'), ''), 'Experience');
  location := coalesce(v_location, 'Location not set');
  played_on := coalesce(v_played, current_date);
  course_rating := coalesce(v_rating, 10);
  would_play_again := case
    when v_would_raw is null then true
    when lower(v_would_raw) in ('yes', 'y', 'true', '1') then true
    when lower(v_would_raw) in ('no', 'n', 'false', '0') then false
    else true
  end;
  note := coalesce(nullif(trim(v_parsed ->> 'message'), ''), '');
  return next;
end;
$$;

create or replace function public.ensure_member_course_round_for_feed_post(p_post_id uuid)
returns table (
  post_id uuid,
  member_course_round_id uuid,
  action text,
  detail text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_post public.member_feed_posts%rowtype;
  v_parsed jsonb;
  v_is_experience boolean := false;
  v_meta record;
  v_existing_round public.member_course_rounds%rowtype;
  v_match_ids uuid[];
  v_match_count int;
  v_round_id uuid;
  v_course_id uuid;
  v_created_course boolean := false;
begin
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if not public.current_user_has_portal_access() and not public.current_user_is_admin() then
    raise exception 'Portal access required.';
  end if;

  select *
  into v_post
  from public.member_feed_posts fp
  where fp.id = p_post_id;

  if not found then
    raise exception 'Post not found.';
  end if;

  if v_post.user_id <> v_user_id and not public.current_user_is_admin() then
    raise exception 'You can only repair your own experience posts.';
  end if;

  if v_post.member_course_round_id is not null then
    select *
    into v_existing_round
    from public.member_course_rounds mcr
    where mcr.id = v_post.member_course_round_id;

    if found then
      if v_existing_round.member_user_id <> v_post.user_id then
        raise exception 'Linked round belongs to another member.';
      end if;

      post_id := v_post.id;
      member_course_round_id := v_existing_round.id;
      action := 'already_linked';
      detail := 'Feed post already has a valid round link.';
      return next;
      return;
    end if;
  end if;

  begin
    v_parsed := v_post.content::jsonb;
  exception
    when others then
      v_parsed := '{}'::jsonb;
  end;

  v_is_experience :=
    v_post.post_type in ('round-review', 'course-review')
    or coalesce(v_parsed ->> 'internalPostType', '') = 'course-review'
    or coalesce(v_parsed ->> 'composerPostType', '') = 'round-review';

  if not v_is_experience then
    post_id := v_post.id;
    member_course_round_id := null;
    action := 'skipped_not_experience';
    detail := 'Post is not a course experience.';
    return next;
    return;
  end if;

  select *
  into v_meta
  from public.parse_experience_feed_post_content(v_post.content);

  -- Prefer date+rating match, then date-only, then single same-name round.
  select coalesce(array_agg(mcr.id), '{}'::uuid[])
  into v_match_ids
  from public.member_course_rounds mcr
  where mcr.member_user_id = v_post.user_id
    and lower(trim(mcr.course_name)) = lower(trim(v_meta.course_name))
    and mcr.played_on = v_meta.played_on
    and (
      v_meta.course_rating is null
      or mcr.course_rating = v_meta.course_rating
    );

  v_match_count := coalesce(cardinality(v_match_ids), 0);

  if v_match_count = 0 then
    select coalesce(array_agg(mcr.id), '{}'::uuid[])
    into v_match_ids
    from public.member_course_rounds mcr
    where mcr.member_user_id = v_post.user_id
      and lower(trim(mcr.course_name)) = lower(trim(v_meta.course_name))
      and mcr.played_on = v_meta.played_on;
    v_match_count := coalesce(cardinality(v_match_ids), 0);
  end if;

  if v_match_count = 0 then
    select coalesce(array_agg(mcr.id), '{}'::uuid[])
    into v_match_ids
    from public.member_course_rounds mcr
    where mcr.member_user_id = v_post.user_id
      and lower(trim(mcr.course_name)) = lower(trim(v_meta.course_name));
    v_match_count := coalesce(cardinality(v_match_ids), 0);
  end if;

  if v_match_count > 1 then
    post_id := v_post.id;
    member_course_round_id := null;
    action := 'ambiguous';
    detail := format('Found %s candidate rounds; left untouched.', v_match_count);
    return next;
    return;
  end if;

  if v_match_count = 1 then
    v_round_id := v_match_ids[1];

    update public.member_feed_posts fp
    set
      member_course_round_id = v_round_id,
      updated_at = now()
    where fp.id = v_post.id
      and fp.user_id = v_post.user_id
      and fp.member_course_round_id is null;

    post_id := v_post.id;
    member_course_round_id := v_round_id;
    action := 'linked_existing';
    detail := 'Linked feed post to an unambiguous existing round.';
    return next;
    return;
  end if;

  -- Resolve course with unique-conflict recovery (never duplicate golf_courses).
  begin
    select f.golf_course_id, f.created_new
    into v_course_id, v_created_course
    from public.find_or_create_member_golf_course_internal(
      v_meta.course_name,
      v_meta.location,
      v_post.user_id
    ) f
    limit 1;
  exception
    when unique_violation then
      select gc.id
      into v_course_id
      from public.golf_courses gc
      where public.normalize_golf_course_name(gc.name) =
            public.normalize_golf_course_name(v_meta.course_name)
        and public.golf_course_location_matches(
          v_meta.location,
          gc.city,
          gc.region,
          gc.country
        )
      order by gc.created_at asc
      limit 1;

      if v_course_id is null then
        select gc.id
        into v_course_id
        from public.golf_courses gc
        where public.normalize_golf_course_name(gc.name) =
              public.normalize_golf_course_name(v_meta.course_name)
        order by gc.created_at asc
        limit 1;
      end if;

      if v_course_id is null then
        raise;
      end if;
      v_created_course := false;
  end;

  if v_course_id is null then
    post_id := v_post.id;
    member_course_round_id := null;
    action := 'error';
    detail := 'Could not resolve a golf course for this experience.';
    return next;
    return;
  end if;

  insert into public.member_course_rounds (
    member_user_id,
    golf_course_id,
    course_name,
    location,
    played_on,
    note,
    would_play_again,
    course_rating
  )
  values (
    v_post.user_id,
    v_course_id,
    v_meta.course_name,
    v_meta.location,
    v_meta.played_on,
    v_meta.note,
    v_meta.would_play_again,
    v_meta.course_rating
  )
  returning id into v_round_id;

  update public.member_feed_posts fp
  set
    member_course_round_id = v_round_id,
    updated_at = now()
  where fp.id = v_post.id
    and fp.user_id = v_post.user_id
    and fp.member_course_round_id is null;

  -- If a concurrent repair already linked, prefer that round.
  if not found then
    select fp.member_course_round_id
    into v_round_id
    from public.member_feed_posts fp
    where fp.id = v_post.id;
  end if;

  post_id := v_post.id;
  member_course_round_id := v_round_id;
  action := 'created_round';
  detail := case
    when v_created_course then 'Created member-submitted course + round and linked feed post.'
    else 'Created round for existing course and linked feed post.'
  end;
  return next;
end;
$$;

revoke all on function public.ensure_member_course_round_for_feed_post(uuid) from public;
grant execute on function public.ensure_member_course_round_for_feed_post(uuid) to authenticated;

create or replace function public.backfill_orphan_experience_round_links()
returns table (
  post_id uuid,
  member_course_round_id uuid,
  action text,
  detail text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  r record;
begin
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if not public.current_user_is_admin() and not public.current_user_has_portal_access() then
    raise exception 'Portal access required.';
  end if;

  for r in
    select fp.id
    from public.member_feed_posts fp
    where fp.member_course_round_id is null
      and (
        public.current_user_is_admin()
        or fp.user_id = v_user_id
      )
      and (
        fp.post_type in ('round-review', 'course-review')
        or coalesce(fp.content::jsonb ->> 'internalPostType', '') = 'course-review'
        or coalesce(fp.content::jsonb ->> 'composerPostType', '') = 'round-review'
      )
    order by fp.created_at asc
  loop
    return query
    select *
    from public.ensure_member_course_round_for_feed_post(r.id);
  end loop;
end;
$$;

revoke all on function public.backfill_orphan_experience_round_links() from public;
grant execute on function public.backfill_orphan_experience_round_links() to authenticated;

-- Harden shared find-or-create against slug races / existing name matches.
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
  v_generated_slug text;
  v_inserted_slug text;
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
    case
      when gc.source_name in ('elitetee_seed', 'elitetee_curated') then 0
      else 1
    end,
    gc.submitted_by_member asc,
    gc.created_at asc
  limit 1;

  if v_match_id is null then
    select gc.id, gc.slug
    into v_match_id, v_match_slug
    from public.golf_courses gc
    where public.normalize_golf_course_name(gc.name) = public.normalize_golf_course_name(v_name)
    order by gc.created_at asc
    limit 1;
  end if;

  if v_match_id is not null then
    golf_course_id := v_match_id;
    slug := v_match_slug;
    created_new := false;
    return next;
    return;
  end if;

  v_generated_slug := public.generate_unique_golf_course_slug(v_name, v_city, v_region);

  begin
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
      v_generated_slug,
      v_city,
      v_region,
      v_country,
      'member_submitted',
      p_created_by_user_id,
      'published',
      now(),
      true
    )
    returning public.golf_courses.id, public.golf_courses.slug
    into golf_course_id, v_inserted_slug;
  exception
    when unique_violation then
      select gc.id, gc.slug
      into golf_course_id, v_inserted_slug
      from public.golf_courses gc
      where public.normalize_golf_course_name(gc.name) = public.normalize_golf_course_name(v_name)
      order by gc.created_at asc
      limit 1;

      if golf_course_id is null then
        raise;
      end if;

      slug := v_inserted_slug;
      created_new := false;
      return next;
      return;
  end;

  slug := v_inserted_slug;
  created_new := true;
  return next;
end;
$$;

