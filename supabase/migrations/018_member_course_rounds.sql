-- Member-submitted course rounds for the growing EliteTee course library.
-- Run in Supabase SQL Editor after prior migrations.

create table if not exists public.member_course_rounds (
  id uuid primary key default gen_random_uuid(),
  member_user_id uuid not null references public.users (id) on delete cascade,
  course_name text not null,
  location text not null,
  played_on date not null,
  note text not null default '',
  would_play_again boolean not null,
  created_at timestamptz not null default now(),
  constraint member_course_rounds_course_name_check check (char_length(trim(course_name)) > 0),
  constraint member_course_rounds_location_check check (char_length(trim(location)) > 0)
);

create index if not exists member_course_rounds_created_at_idx
  on public.member_course_rounds (created_at desc);

create index if not exists member_course_rounds_member_user_id_idx
  on public.member_course_rounds (member_user_id, played_on desc);

alter table public.member_course_rounds enable row level security;

drop policy if exists "Portal members can read course rounds" on public.member_course_rounds;
drop policy if exists "Portal members can add course rounds" on public.member_course_rounds;

create policy "Portal members can read course rounds"
  on public.member_course_rounds
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

create policy "Portal members can add course rounds"
  on public.member_course_rounds
  for insert
  to authenticated
  with check (
    member_user_id = auth.uid()
    and exists (
      select 1
      from public.member_profiles mp
      where mp.user_id = auth.uid()
        and mp.portal_access_enabled = true
    )
  );

grant select, insert on public.member_course_rounds to authenticated;
