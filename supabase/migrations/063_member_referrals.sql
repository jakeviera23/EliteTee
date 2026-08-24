-- Migration 063: member referral codes + application attribution (Invite a Golfer V1).
-- Apply after 060_course_round_media_system, 061_delete_own_feed_post, 062_ensure_experience_round_link.
-- Safe to rerun: uses IF NOT EXISTS / CREATE OR REPLACE / DROP IF EXISTS.

-- ---------------------------------------------------------------------------
-- 1. Referral codes (one active code per portal member)
-- ---------------------------------------------------------------------------

create table if not exists public.member_referral_codes (
  member_user_id uuid primary key references auth.users (id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now(),
  revoked_at timestamptz null
);

create index if not exists member_referral_codes_code_idx
  on public.member_referral_codes (code)
  where revoked_at is null;

alter table public.member_referral_codes enable row level security;

-- No direct member/anon access; codes are issued via SECURITY DEFINER RPCs only.

-- ---------------------------------------------------------------------------
-- 2. Application attribution (immutable after insert)
-- ---------------------------------------------------------------------------

alter table public.membership_applications
  add column if not exists referrer_member_user_id uuid references auth.users (id) on delete set null,
  add column if not exists referral_code_used text null,
  add column if not exists referral_captured_at timestamptz null;

create index if not exists membership_applications_referrer_status_idx
  on public.membership_applications (referrer_member_user_id, status)
  where referrer_member_user_id is not null;

-- ---------------------------------------------------------------------------
-- 3. Referral code generation helper
-- ---------------------------------------------------------------------------

create or replace function public.generate_member_referral_code()
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_code text;
  v_attempts integer := 0;
begin
  loop
    v_attempts := v_attempts + 1;
    if v_attempts > 20 then
      raise exception 'Unable to generate unique referral code';
    end if;

    v_code := encode(gen_random_bytes(12), 'hex');

    exit when not exists (
      select 1
      from public.member_referral_codes
      where code = v_code
    );
  end loop;

  return v_code;
end;
$$;

revoke all on function public.generate_member_referral_code() from public;

-- ---------------------------------------------------------------------------
-- 4. Resolve referral on application insert (server-side only)
-- ---------------------------------------------------------------------------

create or replace function public.resolve_membership_application_referral()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referrer_user_id uuid;
  v_referrer_email text;
begin
  -- Never trust client-supplied referrer UUID.
  new.referrer_member_user_id := null;

  if new.referral_code_used is null or length(trim(new.referral_code_used)) = 0 then
    new.referral_code_used := null;
    new.referral_captured_at := null;
    return new;
  end if;

  new.referral_code_used := lower(trim(new.referral_code_used));

  select rc.member_user_id
  into v_referrer_user_id
  from public.member_referral_codes rc
  inner join public.member_profiles mp
    on mp.user_id = rc.member_user_id
  where rc.code = new.referral_code_used
    and rc.revoked_at is null
    and mp.portal_access_enabled = true
  limit 1;

  if v_referrer_user_id is null then
    new.referral_code_used := null;
    new.referrer_member_user_id := null;
    new.referral_captured_at := null;
    return new;
  end if;

  select lower(trim(mp.email))
  into v_referrer_email
  from public.member_profiles mp
  where mp.user_id = v_referrer_user_id
  limit 1;

  if v_referrer_email is not null
     and lower(trim(new.email)) = v_referrer_email then
    new.referral_code_used := null;
    new.referrer_member_user_id := null;
    new.referral_captured_at := null;
    return new;
  end if;

  new.referrer_member_user_id := v_referrer_user_id;
  new.referral_captured_at := now();
  return new;
end;
$$;

drop trigger if exists membership_applications_resolve_referral on public.membership_applications;

create trigger membership_applications_resolve_referral
  before insert on public.membership_applications
  for each row
  execute function public.resolve_membership_application_referral();

-- ---------------------------------------------------------------------------
-- 5. Prevent referral attribution changes after submission
-- ---------------------------------------------------------------------------

create or replace function public.protect_membership_application_referral()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.referrer_member_user_id := old.referrer_member_user_id;
  new.referral_code_used := old.referral_code_used;
  new.referral_captured_at := old.referral_captured_at;
  return new;
end;
$$;

drop trigger if exists membership_applications_protect_referral on public.membership_applications;

create trigger membership_applications_protect_referral
  before update on public.membership_applications
  for each row
  execute function public.protect_membership_application_referral();

-- ---------------------------------------------------------------------------
-- 6. Member RPC: get or create stable referral code
-- ---------------------------------------------------------------------------

create or replace function public.get_or_create_member_referral_code()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_code text;
  v_attempts integer := 0;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not public.current_user_has_portal_access() then
    raise exception 'Portal access required';
  end if;

  loop
    v_attempts := v_attempts + 1;
    if v_attempts > 20 then
      raise exception 'Unable to create referral code';
    end if;

    select rc.code
    into v_code
    from public.member_referral_codes rc
    where rc.member_user_id = v_uid
      and rc.revoked_at is null
    limit 1;

    exit when v_code is not null;

    v_code := public.generate_member_referral_code();

    begin
      insert into public.member_referral_codes (member_user_id, code)
      values (v_uid, v_code)
      on conflict (member_user_id) do nothing;
    exception
      when unique_violation then
        -- Concurrent first-time create or rare opaque-code collision; re-select/retry.
        null;
    end;

    select rc.code
    into v_code
    from public.member_referral_codes rc
    where rc.member_user_id = v_uid
      and rc.revoked_at is null
    limit 1;
  end loop;

  return json_build_object('code', v_code);
end;
$$;

revoke all on function public.get_or_create_member_referral_code() from public;
grant execute on function public.get_or_create_member_referral_code() to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Member RPC: referral summary counts (no applicant PII)
-- ---------------------------------------------------------------------------

create or replace function public.get_member_referral_stats()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_pending bigint;
  v_joined bigint;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not public.current_user_has_portal_access() then
    raise exception 'Portal access required';
  end if;

  select count(*)
  into v_pending
  from public.membership_applications ma
  where ma.referrer_member_user_id = v_uid
    and ma.status = 'pending_review';

  select count(*)
  into v_joined
  from public.membership_applications ma
  where ma.referrer_member_user_id = v_uid
    and ma.status = 'approved'
    and ma.invite_redeemed_at is not null;

  return json_build_object(
    'pending_count', coalesce(v_pending, 0),
    'joined_count', coalesce(v_joined, 0)
  );
end;
$$;

revoke all on function public.get_member_referral_stats() from public;
grant execute on function public.get_member_referral_stats() to authenticated;
