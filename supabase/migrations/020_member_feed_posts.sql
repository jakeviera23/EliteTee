-- Member feed posts for the EliteTee member portal.
-- Run in Supabase SQL Editor after prior migrations.

create table if not exists public.member_feed_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  member_profile_id uuid references public.member_profiles (id) on delete cascade,
  content text not null,
  post_type text not null default 'intro',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_feed_posts_content_check check (char_length(trim(content)) > 0)
);

create index if not exists member_feed_posts_created_at_idx
  on public.member_feed_posts (created_at desc);

create index if not exists member_feed_posts_user_id_idx
  on public.member_feed_posts (user_id, created_at desc);

alter table public.member_feed_posts enable row level security;

drop policy if exists "Portal members can read feed posts" on public.member_feed_posts;
drop policy if exists "Portal members can create feed posts" on public.member_feed_posts;
drop policy if exists "Authors can update own feed posts" on public.member_feed_posts;
drop policy if exists "Authors can delete own feed posts" on public.member_feed_posts;

create policy "Portal members can read feed posts"
  on public.member_feed_posts
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.member_profiles mp
      where mp.user_id = auth.uid()
        and mp.portal_access_enabled = true
    )
  );

create policy "Portal members can create feed posts"
  on public.member_feed_posts
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.member_profiles mp
      where mp.user_id = auth.uid()
        and mp.portal_access_enabled = true
    )
  );

create policy "Authors can update own feed posts"
  on public.member_feed_posts
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Authors can delete own feed posts"
  on public.member_feed_posts
  for delete
  to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on public.member_feed_posts to authenticated;
