-- Persistent paginated member feed + backfill linked course-round posts.
-- Run in Supabase SQL Editor after migration 030.
-- Safe to rerun: uses IF NOT EXISTS and idempotent backfill guards.

-- Prevent duplicate feed rows for the same course round.
create unique index if not exists member_feed_posts_round_id_unique_idx
  on public.member_feed_posts (member_course_round_id)
  where member_course_round_id is not null;

create or replace function public.build_course_round_feed_content(
  p_course_name text,
  p_location text,
  p_note text,
  p_would_play_again boolean,
  p_played_on date
)
returns text
language sql
immutable
as $$
  select json_build_object(
    'composerPostType', 'round-review',
    'message', coalesce(nullif(trim(p_note), ''), 'Played ' || trim(p_course_name)),
    'headline', trim(p_course_name),
    'badge', 'Course Played',
    'details', json_build_array(
      json_build_object('label', 'Location', 'value', trim(p_location)),
      json_build_object(
        'label', 'Played',
        'value', to_char(p_played_on, 'FMMon FMDD, YYYY')
      ),
      json_build_object(
        'label', 'Would play again',
        'value', case when p_would_play_again then 'Yes' else 'No' end
      )
    ),
    'internalPostType', 'course-review'
  )::text;
$$;

-- Idempotent backfill: rounds without a linked feed post get one feed row.
insert into public.member_feed_posts (
  user_id,
  member_profile_id,
  content,
  post_type,
  member_course_round_id,
  created_at,
  updated_at
)
select
  mcr.member_user_id,
  mp.id,
  public.build_course_round_feed_content(
    mcr.course_name,
    mcr.location,
    mcr.note,
    mcr.would_play_again,
    mcr.played_on
  ),
  'round-review',
  mcr.id,
  mcr.created_at,
  mcr.created_at
from public.member_course_rounds mcr
left join public.member_profiles mp
  on mp.user_id = mcr.member_user_id
where not exists (
  select 1
  from public.member_feed_posts fp
  where fp.member_course_round_id = mcr.id
);

drop function if exists public.fetch_member_feed_page(timestamptz, uuid, integer);

create function public.fetch_member_feed_page(
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null,
  p_limit integer default 20
)
returns table (
  id uuid,
  user_id uuid,
  member_profile_id uuid,
  member_course_round_id uuid,
  content text,
  post_type text,
  created_at timestamptz,
  updated_at timestamptz,
  full_name text,
  primary_club text,
  based_in text,
  club_logo_url text,
  is_verified boolean,
  profile_user_id uuid,
  founding_member_number text,
  industry text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    fp.id,
    fp.user_id,
    fp.member_profile_id,
    fp.member_course_round_id,
    fp.content,
    fp.post_type,
    fp.created_at,
    fp.updated_at,
    mp.full_name,
    mp.primary_club,
    mp.based_in,
    mp.club_logo_url,
    coalesce(mp.is_verified, false) as is_verified,
    mp.user_id as profile_user_id,
    mp.founding_member_number,
    mp.industry
  from public.member_feed_posts fp
  left join public.member_profiles mp
    on mp.id = fp.member_profile_id
  where public.current_user_has_portal_access()
    and (
      p_cursor_created_at is null
      or p_cursor_id is null
      or (fp.created_at, fp.id) < (p_cursor_created_at, p_cursor_id)
    )
  order by fp.created_at desc, fp.id desc
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;

revoke all on function public.fetch_member_feed_page(timestamptz, uuid, integer) from public;
grant execute on function public.fetch_member_feed_page(timestamptz, uuid, integer) to authenticated;
