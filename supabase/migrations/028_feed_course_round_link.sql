-- Link feed posts to member course rounds (reuse round photos — no duplicate storage).
-- Run in Supabase SQL Editor after migration 027.

alter table public.member_feed_posts
  add column if not exists member_course_round_id uuid
    references public.member_course_rounds (id) on delete set null;

create index if not exists member_feed_posts_round_id_idx
  on public.member_feed_posts (member_course_round_id)
  where member_course_round_id is not null;

-- Feed authors may only link posts to rounds they own.
drop policy if exists "Portal members can create feed posts" on public.member_feed_posts;

create policy "Portal members can create feed posts"
  on public.member_feed_posts
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.current_user_has_portal_access()
    and (
      member_course_round_id is null
      or exists (
        select 1
        from public.member_course_rounds mcr
        where mcr.id = member_course_round_id
          and mcr.member_user_id = auth.uid()
      )
    )
  );
