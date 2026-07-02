-- Allow members to read accepted introduction requests for messaging.

drop policy if exists "Members can read pending introduction requests" on public.introduction_requests;
drop policy if exists "Members can read active introduction requests" on public.introduction_requests;

create policy "Members can read active introduction requests"
  on public.introduction_requests
  for select
  to authenticated
  using (status in ('pending', 'accepted'));
