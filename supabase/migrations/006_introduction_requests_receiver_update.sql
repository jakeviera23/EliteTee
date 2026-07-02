-- Allow receivers to accept or decline pending introduction requests.

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
