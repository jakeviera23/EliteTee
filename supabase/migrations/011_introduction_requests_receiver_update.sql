-- Allow receivers to accept/decline pending introduction requests.
-- Adds response columns and RLS policies required for portal Accept/Decline.

alter table public.introduction_requests
  add column if not exists accepted_at timestamptz;

alter table public.introduction_requests
  add column if not exists response_message text;

drop policy if exists "Receivers can update pending introduction requests" on public.introduction_requests;

create policy "Receivers can update pending introduction requests"
  on public.introduction_requests
  for update
  to authenticated
  using (receiver_id = auth.uid() and status = 'pending')
  with check (
    receiver_id = auth.uid()
    and status in ('accepted', 'declined')
  );

-- Let senders/receivers read their own requests after status changes (accept/decline refresh).
drop policy if exists "Participants can read their introduction requests" on public.introduction_requests;

create policy "Participants can read their introduction requests"
  on public.introduction_requests
  for select
  to authenticated
  using (sender_id = auth.uid() or receiver_id = auth.uid());
