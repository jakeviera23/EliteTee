-- MANUAL ROLLBACK for migration 078. Not a migration; never run automatically.
-- Restores the pre-078 production policies and drops the one-pending-per-pair index
-- (state captured read-only from nbacvtscjhdvwggbecbz before 078 was written).
-- WARNING: this reopens the RLS gaps 078 closes (any member can read every
-- introduction request and insert spoofed rows). Use only to recover from an outage.
--
-- Pre-078, anon also held ALL privileges on introduction_requests. That grant is
-- left commented out: anon has no policies on this table, so restoring it is not
-- needed for any member workflow. Uncomment only if an exact restore is required.

begin;

drop index if exists public.introduction_requests_one_pending_per_pair;

create policy "Members can create introduction requests"
  on public.introduction_requests
  for insert
  to authenticated
  with check (true);

create policy "Members can read introduction requests"
  on public.introduction_requests
  for select
  to authenticated
  using (true);

-- grant all on public.introduction_requests to anon;

create policy "Members can send private messages"
  on public.private_messages
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1
      from public.introduction_requests ir
      where ir.id = private_messages.introduction_request_id
        and ir.status = 'accepted'
        and (auth.uid() = ir.sender_id or auth.uid() = ir.receiver_id)
    )
  );

commit;
