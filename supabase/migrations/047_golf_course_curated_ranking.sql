-- EliteTee curated golf course ranking metadata.
-- Nullable fields for internal classification; not used by provider import RPCs.

alter table public.golf_courses
  add column if not exists elite_tier text,
  add column if not exists curated_tags text[] not null default '{}',
  add column if not exists featured_status text;

alter table public.golf_courses
  drop constraint if exists golf_courses_elite_tier_check;

alter table public.golf_courses
  add constraint golf_courses_elite_tier_check
  check (
    elite_tier is null
    or elite_tier in (
      'global_icon',
      'elite_private',
      'destination',
      'notable',
      'member_course'
    )
  );

alter table public.golf_courses
  drop constraint if exists golf_courses_featured_status_check;

alter table public.golf_courses
  add constraint golf_courses_featured_status_check
  check (
    featured_status is null
    or featured_status in ('featured', 'standard')
  );

create index if not exists golf_courses_elite_tier_idx
  on public.golf_courses (elite_tier)
  where elite_tier is not null;

create index if not exists golf_courses_featured_status_idx
  on public.golf_courses (featured_status)
  where featured_status is not null;

create index if not exists golf_courses_curated_tags_idx
  on public.golf_courses using gin (curated_tags);
