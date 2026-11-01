-- Migration 078: close introduction_requests RLS gaps found in the portal audit.
--
-- Production currently has two permissive legacy policies alongside the strict ones
-- from migration 024/066. Permissive policies are OR'd, so the legacy ones override
-- every protection:
--   * "Members can create introduction requests"  INSERT  WITH CHECK (true)
--       -> any member can insert rows with a spoofed sender_id or status 'accepted'.
--   * "Members can read introduction requests"     SELECT  USING (true)
--       -> any member can read every introduction request and its private note.
-- The strict policies that remain after this migration:
--   * "Members can insert introduction requests"       (sender = auth.uid(), pending, note >= 20 chars,
--                                                        not already introduced)
--   * "Participants can read their introduction requests" (sender or receiver = auth.uid())
--   * "Receivers can update pending introduction requests"
--   * "Senders can cancel pending introduction requests"
--
-- The unique pending index from migration 024 is also missing in production; it is
-- recreated pair-wide so neither duplicate nor reciprocal pending requests can exist.
-- Pre-check on production (read-only): 0 duplicate pending pairs, 0 reciprocal pending pairs.
--
-- "Members can send private messages" on private_messages is a redundant legacy
-- INSERT policy that does not constrain receiver_id. "Participants can send private
-- messages" already covers both intro-threaded and direct messages with stricter checks.
--
-- No data is modified. Rollback: backups/078_introduction_requests_rls_hardening.rollback.sql

begin;

drop policy if exists "Members can create introduction requests" on public.introduction_requests;
drop policy if exists "Members can read introduction requests" on public.introduction_requests;

revoke all on public.introduction_requests from anon;

create unique index if not exists introduction_requests_one_pending_per_pair
  on public.introduction_requests (
    least(sender_id, receiver_id),
    greatest(sender_id, receiver_id)
  )
  where status = 'pending';

drop policy if exists "Members can send private messages" on public.private_messages;

commit;
