-- Private messages tied to accepted introduction requests.

create table if not exists public.private_messages (
  id uuid primary key default gen_random_uuid(),
  introduction_request_id uuid not null references public.introduction_requests(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  receiver_id uuid not null references public.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.private_messages add column if not exists introduction_request_id uuid;
alter table public.private_messages add column if not exists sender_id uuid;
alter table public.private_messages add column if not exists receiver_id uuid;
alter table public.private_messages add column if not exists body text;
alter table public.private_messages add column if not exists created_at timestamptz not null default now();

alter table public.private_messages enable row level security;

drop policy if exists "Participants can read private messages" on public.private_messages;
drop policy if exists "Participants can send private messages" on public.private_messages;

create policy "Participants can read private messages"
  on public.private_messages
  for select
  to authenticated
  using (
    (sender_id = auth.uid() or receiver_id = auth.uid())
    and exists (
      select 1
      from public.introduction_requests ir
      where ir.id = introduction_request_id
        and ir.status = 'accepted'
        and (ir.sender_id = auth.uid() or ir.receiver_id = auth.uid())
    )
  );

create policy "Participants can send private messages"
  on public.private_messages
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1
      from public.introduction_requests ir
      where ir.id = introduction_request_id
        and ir.status = 'accepted'
        and (
          (ir.sender_id = auth.uid() and receiver_id = ir.receiver_id)
          or (ir.receiver_id = auth.uid() and receiver_id = ir.sender_id)
        )
    )
  );
