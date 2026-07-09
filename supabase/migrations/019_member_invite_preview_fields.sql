-- Extend invite preview with application fields used during member onboarding.

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
    'status', v_app.status,
    'location', v_app.location,
    'home_club', v_app.home_club,
    'handicap', v_app.handicap,
    'instagram', v_app.instagram
  );
end;
$$;
