-- Persist member profile fields previously stored only in browser localStorage.

alter table public.member_profiles
  add column if not exists handicap text not null default '',
  add column if not exists bucket_list_course_ids uuid[] not null default '{}';

comment on column public.member_profiles.handicap is
  'Member-reported handicap index (text to preserve formatting like 8.4).';

comment on column public.member_profiles.bucket_list_course_ids is
  'Golf course library IDs the member wants to play (references golf_courses.id).';
