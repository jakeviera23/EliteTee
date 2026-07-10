-- Prevent duplicate pending introduction requests between the same members.
-- Safe to run after migrations 003 and 011.

create unique index if not exists introduction_requests_pending_pair_unique
  on public.introduction_requests (sender_id, receiver_id)
  where status = 'pending';

-- Ensure participants can read declined requests for their own history.
drop policy if exists "Members can read active introduction requests" on public.introduction_requests;

create policy "Members can read active introduction requests"
  on public.introduction_requests
  for select
  to authenticated
  using (
    status in ('pending', 'accepted', 'declined')
    and (sender_id = auth.uid() or receiver_id = auth.uid())
  );
