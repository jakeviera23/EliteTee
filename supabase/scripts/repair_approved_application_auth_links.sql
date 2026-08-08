-- Backfill approved applications where the applicant already has a Supabase Auth account.
-- Run manually in Supabase SQL Editor after migration 062.
--
-- For each approved, unredeemed application with a matching auth.users email, this links:
--   public.users.id
--   member_profiles.user_id + portal_access_enabled
--   membership_applications.invitation_user_id + invite_redeemed_at

do $$
declare
  v_app record;
  v_auth_user_id uuid;
  v_auth_email text;
begin
  for v_app in
    select id, email
    from public.membership_applications
    where status = 'approved'
      and member_profile_id is not null
      and invite_redeemed_at is null
    order by reviewed_at asc nulls last, created_at asc
  loop
    select au.id, lower(trim(au.email))
    into v_auth_user_id, v_auth_email
    from auth.users au
    where lower(trim(au.email)) = lower(trim(v_app.email))
    order by au.created_at desc
    limit 1;

    if v_auth_user_id is null then
      continue;
    end if;

    perform public._link_membership_application_to_auth_user(
      v_app.id,
      v_auth_user_id,
      v_auth_email
    );
  end loop;
end;
$$;
