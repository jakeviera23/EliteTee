-- =============================================================================
-- EliteTee migration verification (READ-ONLY)
-- =============================================================================
-- Purpose: Verify whether migrations 035–039 are already applied in Supabase,
--          regardless of supabase_migrations.schema_migrations history.
-- Run in: Supabase SQL Editor (staging / preview project)
-- Safe:   SELECT-only checks — does not CREATE, ALTER, DROP, or INSERT anything.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Summary header
-- ---------------------------------------------------------------------------
select
  '035_approved_member_profile_access' as migration,
  'Profile access RPCs and RLS' as scope;

-- ---------------------------------------------------------------------------
-- 035: current_user_has_portal_access()
-- ---------------------------------------------------------------------------
select
  '035' as migration,
  'function current_user_has_portal_access()' as object,
  case
    when exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'current_user_has_portal_access'
        and pg_get_function_identity_arguments(p.oid) = ''
    ) then 'OK'
    else 'MISSING'
  end as status;

-- ---------------------------------------------------------------------------
-- 035: Portal members can read portal profiles (RLS policy)
-- ---------------------------------------------------------------------------
select
  '035' as migration,
  'policy member_profiles: Portal members can read portal profiles' as object,
  case
    when exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'member_profiles'
        and policyname = 'Portal members can read portal profiles'
    ) then 'OK'
    else 'MISSING'
  end as status;

-- ---------------------------------------------------------------------------
-- 035: get_portal_member_profile / get_portal_member_profiles_by_user_ids
-- ---------------------------------------------------------------------------
select
  '035' as migration,
  'function get_portal_member_profile(uuid)' as object,
  case
    when exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'get_portal_member_profile'
        and pg_get_function_identity_arguments(p.oid) = 'p_user_id uuid'
    ) then 'OK'
    else 'MISSING'
  end as status
union all
select
  '035',
  'function get_portal_member_profiles_by_user_ids(uuid[])',
  case
    when exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'get_portal_member_profiles_by_user_ids'
        and pg_get_function_identity_arguments(p.oid) = 'p_user_ids uuid[]'
    ) then 'OK'
    else 'MISSING'
  end;

-- ---------------------------------------------------------------------------
-- 035: member_course_rounds read policy uses portal access helper
-- ---------------------------------------------------------------------------
select
  '035' as migration,
  'policy member_course_rounds: Portal members can read course rounds' as object,
  case
    when exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'member_course_rounds'
        and policyname = 'Portal members can read course rounds'
    ) then 'OK'
    else 'MISSING'
  end as status,
  coalesce(
    (
      select left(qual, 120)
      from pg_policies
      where schemaname = 'public'
        and tablename = 'member_course_rounds'
        and policyname = 'Portal members can read course rounds'
    ),
    ''
  ) as policy_qual_preview;

-- =============================================================================
-- 036: member_profile_media
-- =============================================================================
select
  '036' as migration,
  'column member_profiles.cover_photo_url' as object,
  case
    when exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'member_profiles'
        and column_name = 'cover_photo_url'
    ) then 'OK'
    else 'MISSING'
  end as status,
  coalesce(
    (
      select data_type
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'member_profiles'
        and column_name = 'cover_photo_url'
    ),
    ''
  ) as column_type;

-- 036: storage bucket member-profile-media
select
  '036' as migration,
  'storage bucket member-profile-media' as object,
  case
    when exists (
      select 1 from storage.buckets where id = 'member-profile-media'
    ) then 'OK'
    else 'MISSING'
  end as status,
  coalesce(
    (select case when public then 'public' else 'private' end from storage.buckets where id = 'member-profile-media'),
    ''
  ) as bucket_visibility;

-- 036: storage policies on member-profile-media
select
  '036' as migration,
  p.policyname as object,
  'OK' as status
from pg_policies p
where p.schemaname = 'storage'
  and p.tablename = 'objects'
  and p.policyname in (
    'Portal members can read member profile media',
    'Members can upload own member profile media',
    'Members can update own member profile media',
    'Members can delete own member profile media'
  )
order by p.policyname;

select
  '036' as migration,
  'storage policy count (expect 4)' as object,
  case
    when (
      select count(*)
      from pg_policies p
      where p.schemaname = 'storage'
        and p.tablename = 'objects'
        and p.policyname in (
          'Portal members can read member profile media',
          'Members can upload own member profile media',
          'Members can update own member profile media',
          'Members can delete own member profile media'
        )
    ) = 4 then 'OK'
    else 'INCOMPLETE'
  end as status,
  (
    select count(*)::text
    from pg_policies p
    where p.schemaname = 'storage'
      and p.tablename = 'objects'
      and p.policyname in (
        'Portal members can read member profile media',
        'Members can upload own member profile media',
        'Members can update own member profile media',
        'Members can delete own member profile media'
      )
  ) as found_count;

-- 036: portal RPCs return cover_photo_url (check return column on live function)
select
  '036' as migration,
  'get_portal_member_profile returns cover_photo_url' as object,
  case
    when exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      join pg_attribute a on a.attrelid = p.prorettype
      where n.nspname = 'public'
        and p.proname = 'get_portal_member_profile'
        and pg_get_function_identity_arguments(p.oid) = 'p_user_id uuid'
    ) then 'CHECK_MANUAL'
    else 'MISSING_FUNCTION'
  end as status;

-- Safer: inspect composite return type columns via pg_get_function_result
select
  '036' as migration,
  'get_portal_member_profile result columns' as object,
  case
    when position('cover_photo_url' in pg_get_function_result(p.oid)) > 0 then 'OK'
    else 'MISSING cover_photo_url in return type'
  end as status
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'get_portal_member_profile'
  and pg_get_function_identity_arguments(p.oid) = 'p_user_id uuid';

-- =============================================================================
-- 037: ai_concierge_foundation
-- =============================================================================
select
  '037' as migration,
  'function current_user_is_admin()' as object,
  case
    when exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'current_user_is_admin'
    ) then 'OK'
    else 'MISSING'
  end as status;

-- 037: AI tables
select
  '037' as migration,
  t.table_name as object,
  case when t.table_name is not null then 'OK' else 'MISSING' end as status
from (
  values
    ('ai_settings'),
    ('ai_queries'),
    ('member_match_suggestions'),
    ('ai_feedback')
) expected(table_name)
left join information_schema.tables t
  on t.table_schema = 'public'
 and t.table_name = expected.table_name
order by expected.table_name;

-- 037: AI retrieval RPCs
select
  '037' as migration,
  expected.fn as object,
  case when p.oid is not null then 'OK' else 'MISSING' end as status
from (
  values
    ('ai_search_portal_members', 'p_filters jsonb, p_limit integer'),
    ('ai_search_golf_courses', 'p_query text, p_limit integer'),
    ('ai_members_by_course', 'p_course_id uuid'),
    ('ai_member_round_summary', 'p_user_ids uuid[]'),
    ('ai_admin_get_ops_dashboard', ''),
    ('ai_member_queries_today_count', '')
) expected(fn, args)
left join pg_proc p
  on p.proname = expected.fn
 and pg_get_function_identity_arguments(p.oid) = expected.args
left join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
order by expected.fn;

-- 037: ai_settings singleton row
select
  '037' as migration,
  'ai_settings singleton row (id=1)' as object,
  case
    when exists (select 1 from public.ai_settings where id = 1) then 'OK'
    when exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'ai_settings')
      then 'TABLE_EXISTS_NO_ROW'
    else 'MISSING_TABLE'
  end as status;

-- =============================================================================
-- 038: decimal_course_ratings
-- =============================================================================
select
  '038' as migration,
  'member_course_rounds.course_rating type numeric(3,1)' as object,
  case
    when exists (
      select 1
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = 'member_course_rounds'
        and c.column_name = 'course_rating'
        and c.data_type = 'numeric'
        and c.numeric_precision = 3
        and c.numeric_scale = 1
    ) then 'OK'
    else 'WRONG_TYPE_OR_MISSING'
  end as status,
  coalesce(
    (
      select format_type(a.atttypid, a.atttypmod)
      from pg_attribute a
      join pg_class c on c.oid = a.attrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'member_course_rounds'
        and a.attname = 'course_rating'
        and a.attnum > 0
        and not a.attisdropped
    ),
    ''
  ) as actual_type;

-- 038: course_rating check constraint (1.0–10.0)
select
  '038' as migration,
  'constraint member_course_rounds_course_rating_check' as object,
  case
    when exists (
      select 1
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace n on n.oid = rel.relnamespace
      where n.nspname = 'public'
        and rel.relname = 'member_course_rounds'
        and con.conname = 'member_course_rounds_course_rating_check'
    ) then 'OK'
    else 'MISSING'
  end as status,
  coalesce(
    (
      select pg_get_constraintdef(con.oid)
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace n on n.oid = rel.relnamespace
      where n.nspname = 'public'
        and rel.relname = 'member_course_rounds'
        and con.conname = 'member_course_rounds_course_rating_check'
    ),
    ''
  ) as constraint_def;

-- 038: ai_member_round_summary returns numeric course_rating
select
  '038' as migration,
  'ai_member_round_summary course_rating return type' as object,
  case
    when position('course_rating numeric' in pg_get_function_result(p.oid)) > 0 then 'OK'
    when position('course_rating integer' in pg_get_function_result(p.oid)) > 0 then 'STALE_INTEGER_RETURN'
    else 'CHECK_MANUAL'
  end as status
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'ai_member_round_summary'
  and pg_get_function_identity_arguments(p.oid) = 'p_user_ids uuid[]';

-- =============================================================================
-- 039: feed_post_editing
-- =============================================================================
select
  '039' as migration,
  'column member_course_rounds.updated_at' as object,
  case
    when exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'member_course_rounds'
        and column_name = 'updated_at'
    ) then 'OK'
    else 'MISSING'
  end as status;

-- 039: owner-only UPDATE policies
select
  '039' as migration,
  expected.policyname as object,
  case when p.policyname is not null then 'OK' else 'MISSING' end as status
from (
  values
    ('member_course_rounds', 'Authors can update own course rounds'),
    ('member_feed_posts', 'Authors can update own feed posts')
) expected(tablename, policyname)
left join pg_policies p
  on p.schemaname = 'public'
 and p.tablename = expected.tablename
 and p.policyname = expected.policyname
order by expected.tablename;

-- 039: UPDATE grant on member_course_rounds for authenticated
select
  '039' as migration,
  'grant UPDATE on member_course_rounds to authenticated' as object,
  case
    when has_table_privilege('authenticated', 'public.member_course_rounds', 'UPDATE') then 'OK'
    else 'MISSING'
  end as status;

-- 039: feed editing RPCs
select
  '039' as migration,
  expected.fn as object,
  case when p.oid is not null then 'OK' else 'MISSING' end as status
from (
  values
    ('edit_member_feed_post', 'p_post_id uuid, p_message text'),
    ('edit_course_round_feed_post', 'p_post_id uuid, p_message text, p_course_rating numeric, p_played_on date, p_would_play_again boolean, p_location text')
) expected(fn, args)
left join pg_proc p
  on p.proname = expected.fn
 and pg_get_function_identity_arguments(p.oid) = expected.args
left join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
order by expected.fn;

-- ---------------------------------------------------------------------------
-- Roll-up: count missing critical objects (informational)
-- ---------------------------------------------------------------------------
select
  'ROLLUP' as migration,
  'critical_missing_count' as object,
  (
    (case when not exists (
      select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'current_user_has_portal_access'
    ) then 1 else 0 end)
    + (case when not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'member_profiles' and column_name = 'cover_photo_url'
    ) then 1 else 0 end)
    + (case when not exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'ai_settings'
    ) then 1 else 0 end)
    + (case when not exists (
      select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'ai_admin_get_ops_dashboard'
    ) then 1 else 0 end)
    + (case when not exists (
      select 1 from information_schema.columns c
      where c.table_schema = 'public' and c.table_name = 'member_course_rounds'
        and c.column_name = 'course_rating' and c.data_type = 'numeric'
    ) then 1 else 0 end)
    + (case when not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'member_course_rounds' and column_name = 'updated_at'
    ) then 1 else 0 end)
    + (case when not exists (
      select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'edit_member_feed_post'
    ) then 1 else 0 end)
  )::text as status,
  '0 = all critical objects present; >0 = apply missing migrations' as note;
