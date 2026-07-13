-- Persistent feed post engagement: likes, comments, and saves.
-- Run after migration 042.

-- ---------------------------------------------------------------------------
-- feed_post_likes
-- ---------------------------------------------------------------------------

create table if not exists public.feed_post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.member_feed_posts (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint feed_post_likes_post_user_unique unique (post_id, user_id)
);

create index if not exists feed_post_likes_post_id_idx
  on public.feed_post_likes (post_id);

create index if not exists feed_post_likes_user_id_idx
  on public.feed_post_likes (user_id, created_at desc);

alter table public.feed_post_likes enable row level security;

drop policy if exists "Portal members can read feed post likes" on public.feed_post_likes;
drop policy if exists "Members can create own feed post likes" on public.feed_post_likes;
drop policy if exists "Members can delete own feed post likes" on public.feed_post_likes;

create policy "Portal members can read feed post likes"
  on public.feed_post_likes
  for select
  to authenticated
  using (public.current_user_has_portal_access());

create policy "Members can create own feed post likes"
  on public.feed_post_likes
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.current_user_has_portal_access()
  );

create policy "Members can delete own feed post likes"
  on public.feed_post_likes
  for delete
  to authenticated
  using (
    user_id = auth.uid()
    and public.current_user_has_portal_access()
  );

grant select, insert, delete on public.feed_post_likes to authenticated;

-- ---------------------------------------------------------------------------
-- feed_post_saves
-- ---------------------------------------------------------------------------

create table if not exists public.feed_post_saves (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.member_feed_posts (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint feed_post_saves_post_user_unique unique (post_id, user_id)
);

create index if not exists feed_post_saves_post_id_idx
  on public.feed_post_saves (post_id);

create index if not exists feed_post_saves_user_id_idx
  on public.feed_post_saves (user_id, created_at desc);

alter table public.feed_post_saves enable row level security;

drop policy if exists "Portal members can read feed post saves" on public.feed_post_saves;
drop policy if exists "Members can create own feed post saves" on public.feed_post_saves;
drop policy if exists "Members can delete own feed post saves" on public.feed_post_saves;

create policy "Portal members can read feed post saves"
  on public.feed_post_saves
  for select
  to authenticated
  using (public.current_user_has_portal_access());

create policy "Members can create own feed post saves"
  on public.feed_post_saves
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.current_user_has_portal_access()
  );

create policy "Members can delete own feed post saves"
  on public.feed_post_saves
  for delete
  to authenticated
  using (
    user_id = auth.uid()
    and public.current_user_has_portal_access()
  );

grant select, insert, delete on public.feed_post_saves to authenticated;

-- ---------------------------------------------------------------------------
-- feed_post_comments
-- ---------------------------------------------------------------------------

create table if not exists public.feed_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.member_feed_posts (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feed_post_comments_body_check check (char_length(trim(body)) > 0)
);

create index if not exists feed_post_comments_post_id_created_at_idx
  on public.feed_post_comments (post_id, created_at asc);

create index if not exists feed_post_comments_user_id_idx
  on public.feed_post_comments (user_id, created_at desc);

alter table public.feed_post_comments enable row level security;

drop policy if exists "Portal members can read feed post comments" on public.feed_post_comments;
drop policy if exists "Members can create own feed post comments" on public.feed_post_comments;
drop policy if exists "Authors can update own feed post comments" on public.feed_post_comments;
drop policy if exists "Authors can delete own feed post comments" on public.feed_post_comments;

create policy "Portal members can read feed post comments"
  on public.feed_post_comments
  for select
  to authenticated
  using (public.current_user_has_portal_access());

create policy "Members can create own feed post comments"
  on public.feed_post_comments
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.current_user_has_portal_access()
  );

create policy "Authors can update own feed post comments"
  on public.feed_post_comments
  for update
  to authenticated
  using (
    user_id = auth.uid()
    and public.current_user_has_portal_access()
  )
  with check (user_id = auth.uid());

create policy "Authors can delete own feed post comments"
  on public.feed_post_comments
  for delete
  to authenticated
  using (
    user_id = auth.uid()
    and public.current_user_has_portal_access()
  );

grant select, insert, update, delete on public.feed_post_comments to authenticated;
