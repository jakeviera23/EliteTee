-- Link approved membership applications to existing Supabase Auth users by normalized email.
-- Enables portal access without redundant invite redemption when auth already exists.
-- Safe to rerun: idempotent linking helpers.

create or replace function public._link_membership_application_to_auth_user(
  p_application_id uuid,
  p_auth_user_id uuid,
  p_auth_email text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app public.membership_applications%rowtype;
  v_profile_id uuid;
  v_normalized_auth_email text;
  v_normalized_app_email text;
begin
  if p_application_id is null or p_auth_user_id is null then
    raise exception 'Application and auth user are required';
  end if;

  v_normalized_auth_email := lower(trim(coalesce(p_auth_email, '')));

  if v_normalized_auth_email = '' then
    raise exception 'Authenticated email is required';
  end if;

  select *
  into v_app
  from public.membership_applications
  where id = p_application_id
    and status = 'approved'
  for update;

  if not found then
    raise exception 'Approved application not found';
  end if;

  v_normalized_app_email := lower(trim(v_app.email));

  if v_normalized_app_email <> v_normalized_auth_email then
    raise exception 'Email does not match this application';
  end if;

  if v_app.invite_redeemed_at is not null
     and v_app.invitation_user_id is not null
     and v_app.invitation_user_id = p_auth_user_id then
  -- Idempotent: already linked to this auth user.
    return v_app.member_profile_id;
  end if;

  if v_app.invitation_user_id is not null
     and v_app.invitation_user_id <> p_auth_user_id then
    raise exception 'Application is already linked to a different auth user';
  end if;

  v_profile_id := v_app.member_profile_id;

  if exists (
    select 1
    from public.member_profiles mp
    where mp.user_id = p_auth_user_id
      and (v_profile_id is null or mp.id <> v_profile_id)
  ) then
    raise exception 'Auth user is already linked to another member profile';
  end if;

  insert into public.users (id, email)
  values (p_auth_user_id, v_normalized_auth_email)
  on conflict (id) do update
    set email = excluded.email;

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
      v_normalized_app_email,
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
      p_auth_user_id
    )
    returning id into v_profile_id;
  else
    update public.member_profiles
    set
      user_id = p_auth_user_id,
      portal_access_enabled = true,
      updated_at = now()
    where id = v_profile_id;
  end if;

  update public.membership_applications
  set
    invite_redeemed_at = coalesce(invite_redeemed_at, now()),
    invitation_user_id = p_auth_user_id,
    member_profile_id = coalesce(member_profile_id, v_profile_id),
    updated_at = now()
  where id = v_app.id;

  return v_profile_id;
end;
$$;

revoke all on function public._link_membership_application_to_auth_user(uuid, uuid, text) from public;

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
  for update;

  if not found then
    raise exception 'Invite is invalid or already used';
  end if;

  if v_app.invite_redeemed_at is not null and v_app.invitation_user_id = v_uid then
    return json_build_object(
      'member_profile_id', v_app.member_profile_id,
      'portal_access_enabled', true,
      'already_redeemed', true
    );
  end if;

  if v_app.invite_redeemed_at is not null then
    raise exception 'Invite is invalid or already used';
  end if;

  if v_app.invite_token_created_at is not null
     and v_app.invite_token_created_at < now() - interval '30 days' then
    raise exception 'Invite has expired';
  end if;

  if lower(trim(v_app.email)) <> v_email then
    raise exception 'Email does not match this invitation';
  end if;

  v_profile_id := public._link_membership_application_to_auth_user(v_app.id, v_uid, v_email);

  return json_build_object(
    'member_profile_id', v_profile_id,
    'portal_access_enabled', true
  );
end;
$$;

revoke all on function public.complete_membership_invite(text) from public;
grant execute on function public.complete_membership_invite(text) to authenticated;

create or replace function public.try_link_application_to_existing_auth_user(p_application_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app public.membership_applications%rowtype;
  v_auth_user_id uuid;
  v_auth_email text;
  v_profile_id uuid;
begin
  if not public.current_user_is_admin() then
    raise exception 'Admin access required';
  end if;

  select *
  into v_app
  from public.membership_applications
  where id = p_application_id
    and status = 'approved';

  if not found then
    raise exception 'Approved application not found';
  end if;

  if v_app.invite_redeemed_at is not null and v_app.invitation_user_id is not null then
    return json_build_object(
      'linked', true,
      'already_redeemed', true,
      'auth_user_id', v_app.invitation_user_id,
      'member_profile_id', v_app.member_profile_id
    );
  end if;

  select au.id, lower(trim(au.email))
  into v_auth_user_id, v_auth_email
  from auth.users au
  where lower(trim(au.email)) = lower(trim(v_app.email))
  order by au.created_at desc
  limit 1;

  if v_auth_user_id is null then
    return json_build_object(
      'linked', false,
      'reason', 'no_auth_user'
    );
  end if;

  v_profile_id := public._link_membership_application_to_auth_user(
    v_app.id,
    v_auth_user_id,
    v_auth_email
  );

  return json_build_object(
    'linked', true,
    'auth_user_id', v_auth_user_id,
    'member_profile_id', v_profile_id,
    'portal_access_enabled', true
  );
end;
$$;

revoke all on function public.try_link_application_to_existing_auth_user(uuid) from public;
grant execute on function public.try_link_application_to_existing_auth_user(uuid) to authenticated;

create or replace function public.complete_pending_membership_invite_for_user()
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

  if public.current_user_has_portal_access() then
    return json_build_object(
      'completed', true,
      'already_active', true
    );
  end if;

  select *
  into v_app
  from public.membership_applications
  where status = 'approved'
    and lower(trim(email)) = v_email
    and member_profile_id is not null
  order by reviewed_at desc nulls last, created_at desc
  limit 1;

  if not found then
    return json_build_object(
      'completed', false,
      'reason', 'no_approved_application'
    );
  end if;

  if v_app.invite_redeemed_at is not null and v_app.invitation_user_id = v_uid then
    return json_build_object(
      'completed', true,
      'already_redeemed', true,
      'member_profile_id', v_app.member_profile_id
    );
  end if;

  if v_app.invite_redeemed_at is not null
     and v_app.invitation_user_id is not null
     and v_app.invitation_user_id <> v_uid then
    return json_build_object(
      'completed', false,
      'reason', 'linked_to_other_user'
    );
  end if;

  v_profile_id := public._link_membership_application_to_auth_user(v_app.id, v_uid, v_email);

  return json_build_object(
    'completed', true,
    'member_profile_id', v_profile_id,
    'portal_access_enabled', true
  );
end;
$$;

revoke all on function public.complete_pending_membership_invite_for_user() from public;
grant execute on function public.complete_pending_membership_invite_for_user() to authenticated;
