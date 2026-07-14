-- Backfill created_by_user_id for legacy member-submitted courses.
-- Infers ownership from the earliest linked member_course_round.
-- Safe to rerun: only updates rows where created_by_user_id is still null.

update public.golf_courses gc
set created_by_user_id = inferred.owner_user_id
from (
  select distinct on (mcr.golf_course_id)
    mcr.golf_course_id,
    mcr.member_user_id as owner_user_id
  from public.member_course_rounds mcr
  where mcr.golf_course_id is not null
    and mcr.member_user_id is not null
  order by
    mcr.golf_course_id,
    mcr.created_at asc nulls last,
    mcr.played_on asc nulls last,
    mcr.id asc
) inferred
where gc.id = inferred.golf_course_id
  and gc.source_name = 'member_submitted'
  and gc.submitted_by_member = true
  and gc.created_by_user_id is null;
