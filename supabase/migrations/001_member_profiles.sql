-- Run in Supabase SQL Editor before using /admin-members.
-- Replace admin emails in the insert policy with your own.

create table if not exists public.member_profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  primary_club text not null,
  additional_clubs text[] not null default '{}',
  based_in text not null,
  regions text[] not null default '{}',
  industry text not null,
  golf_interests text[] not null default '{}',
  business_interests text[] not null default '{}',
  current_request text not null default '',
  membership_status text not null,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.member_profiles enable row level security;

create policy "Admins can insert member profiles"
  on public.member_profiles
  for insert
  to authenticated
  with check (
    lower(auth.jwt() ->> 'email') in (
      lower('you@example.com')
    )
  );

create policy "Admins can read member profiles"
  on public.member_profiles
  for select
  to authenticated
  using (
    lower(auth.jwt() ->> 'email') in (
      lower('you@example.com')
    )
  );
