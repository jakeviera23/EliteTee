-- Resolve authenticated email from JWT or auth.users for invite redemption.
-- Fixes redemption failures immediately after signup when the JWT email claim is not yet populated.

create or replace function public._authenticated_user_email()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select lower(trim(coalesce(
    auth.jwt() ->> 'email',
    (select au.email from auth.users au where au.id = auth.uid())
  )));
$$;

revoke all on function public._authenticated_user_email() from public;

create or replace function public.complete_membership_invite(p_token text)
returns json
language plpgsql
security definer
set search_path = public, auth
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

  v_email := public._authenticated_user_email();
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

create or replace function public.complete_pending_membership_invite_for_user()
returns json
language plpgsql
security definer
set search_path = public, auth
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

  v_email := public._authenticated_user_email();
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
