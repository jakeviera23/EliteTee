-- Link member profiles to public.users and align introduction_requests RLS with user ids.

alter table public.member_profiles add column if not exists user_id uuid references public.users(id) on delete set null;

create index if not exists member_profiles_user_id_idx on public.member_profiles(user_id);

drop policy if exists "Members can insert introduction requests" on public.introduction_requests;

create policy "Members can insert introduction requests"
  on public.introduction_requests
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and sender_id <> receiver_id
    and status = 'pending'
  );
