-- Remove development and test records from EliteTee production data.
-- Preserves the admin account: jakeviera23@gmail.com
--
-- Run in Supabase SQL Editor after reviewing the rows that will be removed.
-- Also delete matching test users from Authentication > Users in the dashboard.

begin;

create temp table _elitetee_test_profiles on commit drop as
select
  mp.id as profile_id,
  mp.user_id,
  mp.email,
  mp.full_name
from public.member_profiles mp
where lower(mp.email) <> lower('jakeviera23@gmail.com')
  and (
    lower(trim(mp.full_name)) in ('test member', 'john smith')
    or lower(mp.email) like '%john.smith%'
    or lower(mp.email) like '%test.member%'
    or lower(mp.email) like '%@example.com'
    or lower(mp.primary_club) in ('test club', 'money', 'testing', 'placeholder', 'tbd')
    or lower(mp.industry) in ('money', 'testing', 'test')
  );

create temp table _elitetee_test_user_ids on commit drop as
select distinct user_id as id
from _elitetee_test_profiles
where user_id is not null;

delete from public.private_messages
where introduction_request_id in (
  select ir.id
  from public.introduction_requests ir
  where ir.sender_id in (select id from _elitetee_test_user_ids)
     or ir.receiver_id in (select id from _elitetee_test_user_ids)
)
or sender_id in (select id from _elitetee_test_user_ids)
or receiver_id in (select id from _elitetee_test_user_ids);

delete from public.introduction_requests
where sender_id in (select id from _elitetee_test_user_ids)
   or receiver_id in (select id from _elitetee_test_user_ids)
   or lower(coalesce(message, '')) like '%testing%'
   or lower(coalesce(message, '')) like '%test member%'
   or lower(coalesce(request_type, '')) like '%test%';

delete from public.member_profiles
where id in (select profile_id from _elitetee_test_profiles);

delete from public.users
where id in (select id from _elitetee_test_user_ids)
  and lower(email) <> lower('jakeviera23@gmail.com');

commit;
