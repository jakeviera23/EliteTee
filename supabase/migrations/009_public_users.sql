-- public.users mirrors Supabase Auth user IDs (auth.uid()).
-- member_profiles.user_id and introduction_requests sender/receiver IDs must use the same UUID.

create table if not exists public.users (
  id uuid primary key,
  email text,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

drop policy if exists "Admins can manage public users" on public.users;

create policy "Admins can manage public users"
  on public.users
  for all
  to authenticated
  using (
    lower(auth.jwt() ->> 'email') in (
      lower('jakeviera23@gmail.com')
    )
  )
  with check (
    lower(auth.jwt() ->> 'email') in (
      lower('jakeviera23@gmail.com')
    )
  );

-- Members can read their own public.users row (optional sanity check from portal).
drop policy if exists "Members can read own public user" on public.users;

create policy "Members can read own public user"
  on public.users
  for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "Admins can update member profiles" on public.member_profiles;

create policy "Admins can update member profiles"
  on public.member_profiles
  for update
  to authenticated
  using (
    lower(auth.jwt() ->> 'email') in (
      lower('jakeviera23@gmail.com')
    )
  )
  with check (
    lower(auth.jwt() ->> 'email') in (
      lower('jakeviera23@gmail.com')
    )
  );
