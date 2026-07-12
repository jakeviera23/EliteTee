-- Secure feed post editing: course-round updates + ownership-safe RPCs.
-- Run in Supabase SQL Editor after migration 038.
-- Safe to rerun: uses IF NOT EXISTS / DROP IF EXISTS.

-- ---------------------------------------------------------------------------
-- 1. member_course_rounds.updated_at + UPDATE RLS
-- ---------------------------------------------------------------------------

alter table public.member_course_rounds
  add column if not exists updated_at timestamptz not null default now();

drop policy if exists "Authors can update own course rounds" on public.member_course_rounds;

create policy "Authors can update own course rounds"
  on public.member_course_rounds
  for update
  to authenticated
  using (
    member_user_id = auth.uid()
    and public.current_user_has_portal_access()
  )
  with check (
    member_user_id = auth.uid()
    and public.current_user_has_portal_access()
  );

grant update on public.member_course_rounds to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Strengthen feed post UPDATE policy (portal access + ownership)
-- ---------------------------------------------------------------------------

drop policy if exists "Authors can update own feed posts" on public.member_feed_posts;

create policy "Authors can update own feed posts"
  on public.member_feed_posts
  for update
  to authenticated
  using (
    user_id = auth.uid()
    and public.current_user_has_portal_access()
  )
  with check (
    user_id = auth.uid()
    and public.current_user_has_portal_access()
  );

-- ---------------------------------------------------------------------------
-- 3. Edit text/general feed posts (caption only)
-- ---------------------------------------------------------------------------

drop function if exists public.edit_member_feed_post(uuid, text);

create function public.edit_member_feed_post(
  p_post_id uuid,
  p_message text
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
  v_trimmed text;
  v_parsed jsonb;
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
    raise exception 'Post text cannot be empty.';
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

  begin
    v_parsed := v_post.content::jsonb;
    if v_parsed ? 'message' and v_parsed ? 'internalPostType' then
      v_parsed := jsonb_set(v_parsed, '{message}', to_jsonb(v_trimmed));
      v_new_content := v_parsed::text;
    else
      raise exception 'invalid_json';
    end if;
  exception
    when others then
      v_new_content := json_build_object(
        'composerPostType', 'general',
        'message', v_trimmed,
        'internalPostType', 'played-today'
      )::text;
  end;

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

revoke all on function public.edit_member_feed_post(uuid, text) from public;
grant execute on function public.edit_member_feed_post(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Edit course-round feed posts (round row + feed JSON when linked)
-- ---------------------------------------------------------------------------

drop function if exists public.edit_course_round_feed_post(
  uuid,
  text,
  numeric,
  date,
  boolean,
  text
);

create function public.edit_course_round_feed_post(
  p_post_id uuid,
  p_message text,
  p_course_rating numeric,
  p_played_on date,
  p_would_play_again boolean,
  p_location text
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

    v_course_name := v_round.course_name;
  else
    begin
      v_parsed := v_post.content::jsonb;
      v_course_name := coalesce(nullif(trim(v_parsed ->> 'headline'), ''), 'Course Played');
    exception
      when others then
        v_course_name := 'Course Played';
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
    'badge', coalesce(v_parsed ->> 'badge', 'Course Played'),
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

revoke all on function public.edit_course_round_feed_post(uuid, text, numeric, date, boolean, text) from public;
grant execute on function public.edit_course_round_feed_post(uuid, text, numeric, date, boolean, text) to authenticated;
