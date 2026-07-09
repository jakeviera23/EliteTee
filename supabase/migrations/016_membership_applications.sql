-- Membership applications + founding member fields
-- Run in Supabase SQL Editor after prior migrations.

-- Founding member numbering (FM-001, FM-002, …)
create sequence if not exists public.founding_member_seq start 1;

create or replace function public.next_founding_member_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  n bigint;
begin
  n := nextval('public.founding_member_seq');
  return 'FM-' || lpad(n::text, 3, '0');
end;
$$;

revoke all on function public.next_founding_member_number() from public;
grant execute on function public.next_founding_member_number() to authenticated;

-- Extend member_profiles for founding member workflow
alter table public.member_profiles
  add column if not exists founding_member_number text unique,
  add column if not exists portal_access_enabled boolean not null default false;

-- Membership applications
create table if not exists public.membership_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  location text not null,
  home_club text not null,
  handicap text,
  instagram text,
  golf_love text not null,
  why_join text not null,
  status text not null default 'pending_review'
    check (status in ('pending_review', 'approved', 'declined')),
  applied_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by_email text,
  decline_reason text,
  member_profile_id uuid references public.member_profiles (id) on delete set null,
  founding_member_number text,
  invitation_user_id uuid,
  invitation_email_draft text,
  invitation_link text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists membership_applications_status_idx
  on public.membership_applications (status, applied_at desc);

create index if not exists membership_applications_email_idx
  on public.membership_applications (lower(email));

alter table public.membership_applications enable row level security;

-- Public can submit applications (insert only, must be pending)
drop policy if exists "Anyone can submit membership applications" on public.membership_applications;

create policy "Anyone can submit membership applications"
  on public.membership_applications
  for insert
  to anon, authenticated
  with check (status = 'pending_review');

-- Admins can read and manage applications
drop policy if exists "Admins can read membership applications" on public.membership_applications;

create policy "Admins can read membership applications"
  on public.membership_applications
  for select
  to authenticated
  using (
    lower(auth.jwt() ->> 'email') in (
      lower('jakeviera23@gmail.com')
    )
  );

drop policy if exists "Admins can update membership applications" on public.membership_applications;

create policy "Admins can update membership applications"
  on public.membership_applications
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
