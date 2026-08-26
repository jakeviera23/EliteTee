-- Migration 064: fix referral code generation under Supabase search_path conventions.
-- REPO HYGIENE ONLY: this migration was already applied to production prior to this commit.
-- Do not manually re-run against production unless verifying drift; CREATE OR REPLACE is idempotent.
--
-- Root cause: generate_member_referral_code() uses SET search_path = public, so
-- unqualified gen_random_bytes() does not resolve (pgcrypto lives in extensions).

create extension if not exists pgcrypto with schema extensions;

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

    v_code := encode(extensions.gen_random_bytes(12), 'hex');

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
