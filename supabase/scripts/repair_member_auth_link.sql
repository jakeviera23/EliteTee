-- Repair member auth linkage when member_profiles.user_id does not match Supabase Auth.
--
-- 1. In Supabase Dashboard, open Authentication > Users and copy the member's User UID.
-- 2. Replace :auth_uid below with that exact UUID.
-- 3. Replace :member_email with the member's login email.
--
-- auth.uid() is the source of truth. These values must match:
--   - public.users.id
--   - member_profiles.user_id
--   - introduction_requests.sender_id / receiver_id (when applicable)

-- :auth_uid = '00000000-0000-0000-0000-000000000000'
-- :member_email = 'member@email.com'

insert into public.users (id, email)
values (:auth_uid, :member_email)
on conflict (id) do update
set email = excluded.email;

update public.member_profiles
set user_id = :auth_uid
where lower(email) = lower(:member_email);

update public.introduction_requests ir
set receiver_id = mp.user_id
from public.member_profiles mp
where lower(mp.email) = lower(:member_email)
  and mp.user_id is not null
  and ir.receiver_id is distinct from mp.user_id
  and ir.status = 'pending';
