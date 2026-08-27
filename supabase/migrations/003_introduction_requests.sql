-- Introduction requests between public.users.
-- sender_id and receiver_id reference public.users.id.
-- Safe to run if the table already exists with sender_id, receiver_id, and status.

-- Fresh installs: public.users is created in 009; bootstrap here so FKs below can apply.
-- Policies remain in 009_public_users.sql.
create table if not exists public.users (
  id uuid primary key,
  email text,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

create table if not exists public.introduction_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.users(id) on delete cascade,
  receiver_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending',
  request_type text not null default 'Other',
  message text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint introduction_requests_sender_receiver_different check (sender_id <> receiver_id)
);

alter table public.introduction_requests add column if not exists request_type text not null default 'Other';
alter table public.introduction_requests add column if not exists message text not null default '';
alter table public.introduction_requests add column if not exists created_at timestamptz not null default now();
alter table public.introduction_requests add column if not exists updated_at timestamptz not null default now();

alter table public.introduction_requests enable row level security;

drop policy if exists "Members can insert introduction requests" on public.introduction_requests;
drop policy if exists "Members can read pending introduction requests" on public.introduction_requests;

create policy "Members can insert introduction requests"
  on public.introduction_requests
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and sender_id <> receiver_id
    and status = 'pending'
  );

create policy "Members can read pending introduction requests"
  on public.introduction_requests
  for select
  to authenticated
  using (status = 'pending');
