-- Decimal member course ratings (1.0–10.0, one decimal place).
-- Preserves existing integer values as 9 → 9.0, 10 → 10.0.
-- Safe to rerun: uses IF EXISTS / OR REPLACE where practical.

-- ---------------------------------------------------------------------------
-- 1. Widen member_course_rounds.course_rating integer → numeric(3,1)
-- ---------------------------------------------------------------------------

alter table public.member_course_rounds
  drop constraint if exists member_course_rounds_course_rating_check;

alter table public.member_course_rounds
  alter column course_rating type numeric(3,1)
  using course_rating::numeric(3,1);

alter table public.member_course_rounds
  alter column course_rating set default 10.0;

alter table public.member_course_rounds
  alter column course_rating set not null;

alter table public.member_course_rounds
  add constraint member_course_rounds_course_rating_check
  check (course_rating >= 1.0 and course_rating <= 10.0);

-- ---------------------------------------------------------------------------
-- 2. Recreate AI RPC whose return signature exposed course_rating as integer
-- ---------------------------------------------------------------------------

drop function if exists public.ai_member_round_summary(uuid[]);

create function public.ai_member_round_summary(p_user_ids uuid[])
returns table (
  user_id uuid,
  golf_course_id uuid,
  course_name text,
  course_slug text,
  location text,
  played_on date,
  course_rating numeric,
  would_play_again boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    mcr.member_user_id as user_id,
    mcr.golf_course_id,
    coalesce(gc.name, mcr.course_name) as course_name,
    gc.slug as course_slug,
    coalesce(
      nullif(trim(concat_ws(', ', gc.city, gc.region, gc.country)), ''),
      mcr.location
    ) as location,
    mcr.played_on,
    mcr.course_rating,
    mcr.would_play_again
  from public.member_course_rounds mcr
  left join public.golf_courses gc on gc.id = mcr.golf_course_id
  where mcr.member_user_id = any(p_user_ids)
    and public.current_user_has_portal_access()
  order by mcr.played_on desc nulls last
  limit 200;
$$;

revoke all on function public.ai_member_round_summary(uuid[]) from public;
grant execute on function public.ai_member_round_summary(uuid[]) to authenticated;
