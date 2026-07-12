-- Member-submitted golf course structured location correction.
-- Run manually in Supabase SQL Editor after migration 039.
-- Safe to rerun: uses DROP IF EXISTS / CREATE OR REPLACE.

-- ---------------------------------------------------------------------------
-- Helper: member-submitted course check
-- ---------------------------------------------------------------------------

create or replace function public.is_member_submitted_golf_course(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.golf_courses gc
    where gc.id = p_course_id
      and (
        gc.submitted_by_member = true
        or gc.source_name = 'member_submitted'
      )
  );
$$;

revoke all on function public.is_member_submitted_golf_course(uuid) from public;

-- ---------------------------------------------------------------------------
-- Admin: update canonical course location for any active course
-- ---------------------------------------------------------------------------

drop function if exists public.admin_update_golf_course_location(uuid, text, text, text);

create function public.admin_update_golf_course_location(
  p_course_id uuid,
  p_city text,
  p_region text,
  p_country text
)
returns table (
  id uuid,
  name text,
  slug text,
  city text,
  region text,
  country text,
  source_name text,
  submitted_by_member boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_city text;
  v_region text;
  v_country text;
begin
  if not public.current_user_is_admin() then
    raise exception 'Admin access is required to update course locations.';
  end if;

  v_city := trim(coalesce(p_city, ''));
  v_region := trim(coalesce(p_region, ''));
  v_country := trim(coalesce(p_country, ''));

  if v_city = '' then
    raise exception 'City is required.';
  end if;

  if v_region = '' then
    raise exception 'State / region is required.';
  end if;

  if v_country = '' then
    raise exception 'Country is required.';
  end if;

  update public.golf_courses gc
  set
    city = v_city,
    region = v_region,
    country = v_country
  where gc.id = p_course_id
    and gc.moderation_status = 'active';

  if not found then
    raise exception 'Course not found or not active.';
  end if;

  return query
  select
    gc.id,
    gc.name,
    gc.slug,
    gc.city,
    gc.region,
    gc.country,
    gc.source_name,
    gc.submitted_by_member
  from public.golf_courses gc
  where gc.id = p_course_id;
end;
$$;

revoke all on function public.admin_update_golf_course_location(uuid, text, text, text) from public;
grant execute on function public.admin_update_golf_course_location(uuid, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Member experience edit: round snapshot + member-submitted course metadata
-- ---------------------------------------------------------------------------

drop function if exists public.edit_course_round_feed_post(
  uuid,
  text,
  numeric,
  date,
  boolean,
  text
);

drop function if exists public.edit_course_round_feed_post(
  uuid,
  text,
  numeric,
  date,
  boolean,
  text,
  text,
  text,
  text
);

create function public.edit_course_round_feed_post(
  p_post_id uuid,
  p_message text,
  p_course_rating numeric,
  p_played_on date,
  p_would_play_again boolean,
  p_location text,
  p_city text default null,
  p_region text default null,
  p_country text default null
)
returns table (
  id uuid,
  content text,
  post_type text,
  created_at timestamptz,
  updated_at timestamptz,
  member_course_round_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_post public.member_feed_posts%rowtype;
  v_round public.member_course_rounds%rowtype;
  v_trimmed text;
  v_location text;
  v_city text;
  v_region text;
  v_country text;
  v_parsed jsonb;
  v_course_name text;
  v_rating_display text;
  v_new_content text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'You must be signed in to edit a post.';
  end if;

  if not public.current_user_has_portal_access() then
    raise exception 'Portal access is required to edit posts.';
  end if;

  v_trimmed := trim(coalesce(p_message, ''));

  if v_trimmed = '' then
    raise exception 'Review text cannot be empty.';
  end if;

  v_location := trim(coalesce(p_location, ''));

  if v_location = '' then
    raise exception 'Location cannot be empty.';
  end if;

  v_city := nullif(trim(coalesce(p_city, '')), '');
  v_region := nullif(trim(coalesce(p_region, '')), '');
  v_country := nullif(trim(coalesce(p_country, '')), '');

  if p_course_rating is null or p_course_rating < 1.0 or p_course_rating > 10.0 then
    raise exception 'Rating must be between 1.0 and 10.0.';
  end if;

  if p_played_on is null then
    raise exception 'Played date is required.';
  end if;

  if p_played_on > current_date then
    raise exception 'Played date cannot be in the future.';
  end if;

  if p_would_play_again is null then
    raise exception 'Would play again is required.';
  end if;

  select *
  into v_post
  from public.member_feed_posts fp
  where fp.id = p_post_id;

  if not found then
    raise exception 'Post not found.';
  end if;

  if v_post.user_id <> v_user_id then
    raise exception 'You can only edit your own posts.';
  end if;

  v_rating_display := trim(to_char(p_course_rating, 'FM9.0'));

  if v_post.member_course_round_id is not null then
    select *
    into v_round
    from public.member_course_rounds mcr
    where mcr.id = v_post.member_course_round_id;

    if not found then
      raise exception 'Linked course round not found.';
    end if;

    if v_round.member_user_id <> v_user_id then
      raise exception 'You can only edit your own course rounds.';
    end if;

    update public.member_course_rounds mcr
    set
      note = v_trimmed,
      course_rating = p_course_rating,
      played_on = p_played_on,
      would_play_again = p_would_play_again,
      location = v_location,
      updated_at = now()
    where mcr.id = v_post.member_course_round_id
      and mcr.member_user_id = v_user_id;

    if v_round.golf_course_id is not null then
      if v_city is not null and v_region is not null and v_country is not null then
        if not public.is_member_submitted_golf_course(v_round.golf_course_id) then
          raise exception 'Only member-submitted courses can have structured location corrected by members.';
        end if;

        update public.golf_courses gc
        set
          city = v_city,
          region = v_region,
          country = v_country
        where gc.id = v_round.golf_course_id
          and (
            gc.submitted_by_member = true
            or gc.source_name = 'member_submitted'
          );
      end if;
    end if;

    v_course_name := v_round.course_name;
  else
    begin
      v_parsed := v_post.content::jsonb;
      v_course_name := coalesce(nullif(trim(v_parsed ->> 'headline'), ''), 'Experience');
    exception
      when others then
        v_course_name := 'Experience';
    end;
  end if;

  begin
    v_parsed := v_post.content::jsonb;
  exception
    when others then
      v_parsed := '{}'::jsonb;
  end;

  v_new_content := jsonb_build_object(
    'composerPostType', 'round-review',
    'message', v_trimmed,
    'headline', v_course_name,
    'badge', coalesce(v_parsed ->> 'badge', 'Experience'),
    'details', jsonb_build_array(
      jsonb_build_object('label', 'Location', 'value', v_location),
      jsonb_build_object(
        'label', 'Played',
        'value', to_char(p_played_on, 'FMMon FMDD, YYYY')
      ),
      jsonb_build_object(
        'label', 'Course Rating',
        'value', v_rating_display || '/10.0'
      ),
      jsonb_build_object(
        'label', 'Would play again',
        'value', case when p_would_play_again then 'Yes' else 'No' end
      )
    ),
    'internalPostType', 'course-review',
    'rating', p_course_rating
  )::text;

  if v_parsed ? 'playedWith' and coalesce(v_parsed ->> 'playedWith', '') <> '' then
    v_new_content := (
      jsonb_set(v_new_content::jsonb, '{playedWith}', v_parsed -> 'playedWith')
    )::text;
  end if;

  update public.member_feed_posts fp
  set
    content = v_new_content,
    updated_at = now()
  where fp.id = p_post_id
    and fp.user_id = v_user_id;

  return query
  select
    fp.id,
    fp.content,
    fp.post_type,
    fp.created_at,
    fp.updated_at,
    fp.member_course_round_id
  from public.member_feed_posts fp
  where fp.id = p_post_id;
end;
$$;

revoke all on function public.edit_course_round_feed_post(uuid, text, numeric, date, boolean, text, text, text, text) from public;
grant execute on function public.edit_course_round_feed_post(uuid, text, numeric, date, boolean, text, text, text, text) to authenticated;
