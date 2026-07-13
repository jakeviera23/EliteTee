-- Allow senders to withdraw pending introduction requests (shown as declined/archived).

drop policy if exists "Senders can cancel pending introduction requests" on public.introduction_requests;

create policy "Senders can cancel pending introduction requests"
  on public.introduction_requests
  for update
  to authenticated
  using (sender_id = auth.uid() and status = 'pending')
  with check (
    sender_id = auth.uid()
    and status = 'declined'
  );
