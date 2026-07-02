-- Member portal polish: own profile updates and private message read tracking.

alter table public.private_messages
  add column if not exists read_at timestamptz;

drop policy if exists "Members can update own profile" on public.member_profiles;

create policy "Members can update own profile"
  on public.member_profiles
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Receivers can mark private messages read" on public.private_messages;

create policy "Receivers can mark private messages read"
  on public.private_messages
  for update
  to authenticated
  using (receiver_id = auth.uid())
  with check (receiver_id = auth.uid());
