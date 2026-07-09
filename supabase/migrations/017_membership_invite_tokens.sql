-- Private invite-token signup for approved membership applications.
-- Run in Supabase SQL Editor after migration 016.

alter table public.membership_applications
  add column if not exists invite_token text unique,
  add column if not exists invite_token_created_at timestamptz,
  add column if not exists invite_redeemed_at timestamptz;

create index if not exists membership_applications_invite_token_idx
  on public.membership_applications (invite_token)
  where invite_token is not null;

create or replace function public.get_membership_invite_by_token(p_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app public.membership_applications%rowtype;
begin
  if p_token is null or length(trim(p_token)) < 32 then
    return null;
  end if;

  select *
  into v_app
  from public.membership_applications
  where invite_token = trim(p_token)
    and status = 'approved'
    and invite_redeemed_at is null
  limit 1;

  if not found then
    return null;
  end if;

  if v_app.invite_token_created_at is not null
     and v_app.invite_token_created_at < now() - interval '30 days' then
    return null;
  end if;

  return json_build_object(
    'full_name', v_app.full_name,
    'email', v_app.email,
    'founding_member_number', v_app.founding_member_number,
    'member_profile_id', v_app.member_profile_id,
    'status', v_app.status
  );
end;
$$;

revoke all on function public.get_membership_invite_by_token(text) from public;
grant execute on function public.get_membership_invite_by_token(text) to anon, authenticated;

create or replace function public.complete_membership_invite(p_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_email text;
  v_app public.membership_applications%rowtype;
  v_profile_id uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  v_email := lower(trim(auth.jwt() ->> 'email'));
  if v_email is null or v_email = '' then
    raise exception 'Authenticated email is required';
  end if;

  if p_token is null or length(trim(p_token)) < 32 then
    raise exception 'Invalid invite token';
  end if;

  select *
  into v_app
  from public.membership_applications
  where invite_token = trim(p_token)
    and status = 'approved'
    and invite_redeemed_at is null
  for update;

  if not found then
    raise exception 'Invite is invalid or already used';
  end if;

  if v_app.invite_token_created_at is not null
     and v_app.invite_token_created_at < now() - interval '30 days' then
    raise exception 'Invite has expired';
  end if;

  if lower(trim(v_app.email)) <> v_email then
    raise exception 'Email does not match this invitation';
  end if;

  insert into public.users (id, email)
  values (v_uid, v_email)
  on conflict (id) do update
    set email = excluded.email;

  v_profile_id := v_app.member_profile_id;

  if v_profile_id is null then
    insert into public.member_profiles (
      full_name,
      email,
      primary_club,
      additional_clubs,
      based_in,
      regions,
      industry,
      golf_interests,
      business_interests,
      current_request,
      traveling_to,
      membership_status,
      is_verified,
      founding_member_number,
      portal_access_enabled,
      user_id
    )
    values (
      v_app.full_name,
      lower(trim(v_app.email)),
      v_app.home_club,
      '{}',
      v_app.location,
      case
        when v_app.location is not null and v_app.location <> '' then array[v_app.location]
        else '{}'
      end,
      'Not specified',
      case
        when v_app.golf_love is not null and v_app.golf_love <> '' then array[v_app.golf_love]
        else '{}'
      end,
      '{}',
      v_app.why_join,
      '',
      'Founding Member',
      true,
      v_app.founding_member_number,
      true,
      v_uid
    )
    returning id into v_profile_id;
  else
    update public.member_profiles
    set
      user_id = v_uid,
      portal_access_enabled = true,
      updated_at = now()
    where id = v_profile_id;
  end if;

  update public.membership_applications
  set
    invite_redeemed_at = now(),
    invitation_user_id = v_uid,
    member_profile_id = coalesce(member_profile_id, v_profile_id),
    updated_at = now()
  where id = v_app.id;

  return json_build_object(
    'member_profile_id', v_profile_id,
    'portal_access_enabled', true
  );
end;
$$;

revoke all on function public.complete_membership_invite(text) from public;
grant execute on function public.complete_membership_invite(text) to authenticated;
