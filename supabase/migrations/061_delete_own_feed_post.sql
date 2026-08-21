-- Owner (or admin) delete for feed posts and linked course-round experiences.
-- Cascades engagement rows via existing FKs. Removes round photo storage objects.
-- Never deletes golf_courses.

create or replace function public.delete_own_feed_post(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_user_id uuid := auth.uid();
  v_post public.member_feed_posts%rowtype;
  v_round_id uuid;
  v_paths text[];
begin
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if not exists (
    select 1
    from public.member_profiles mp
    where mp.user_id = v_user_id
      and mp.portal_access_enabled = true
  ) and not public.current_user_is_admin() then
    raise exception 'Portal access required.';
  end if;

  select *
  into v_post
  from public.member_feed_posts fp
  where fp.id = p_post_id;

  if not found then
    raise exception 'Post not found.';
  end if;

  if v_post.user_id <> v_user_id and not public.current_user_is_admin() then
    raise exception 'You can only delete your own posts.';
  end if;

  v_round_id := v_post.member_course_round_id;

  if v_round_id is not null then
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'member_course_round_photos'
        and column_name = 'poster_storage_path'
    ) then
      select coalesce(array_agg(path), '{}'::text[])
      into v_paths
      from (
        select mcrp.storage_path as path
        from public.member_course_round_photos mcrp
        where mcrp.member_course_round_id = v_round_id
        union all
        select mcrp.poster_storage_path as path
        from public.member_course_round_photos mcrp
        where mcrp.member_course_round_id = v_round_id
          and mcrp.poster_storage_path is not null
          and length(trim(mcrp.poster_storage_path)) > 0
      ) paths;
    else
      select coalesce(array_agg(mcrp.storage_path), '{}'::text[])
      into v_paths
      from public.member_course_round_photos mcrp
      where mcrp.member_course_round_id = v_round_id;
    end if;
  else
    v_paths := '{}'::text[];
  end if;

  -- Engagement rows cascade from member_feed_posts.
  delete from public.member_feed_posts
  where id = p_post_id;

  if v_round_id is not null then
    -- Photo rows cascade from member_course_rounds.
    delete from public.member_course_rounds
    where id = v_round_id
      and member_user_id = v_post.user_id;

    if coalesce(array_length(v_paths, 1), 0) > 0 then
      delete from storage.objects
      where bucket_id = 'course-round-photos'
        and name = any (v_paths);
    end if;
  end if;
end;
$$;

revoke all on function public.delete_own_feed_post(uuid) from public;
grant execute on function public.delete_own_feed_post(uuid) to authenticated;

-- Allow owners to delete their own rounds when needed outside the RPC path.
drop policy if exists "Authors can delete own course rounds" on public.member_course_rounds;

create policy "Authors can delete own course rounds"
  on public.member_course_rounds
  for delete
  to authenticated
  using (
    member_user_id = auth.uid()
    and exists (
      select 1
      from public.member_profiles mp
      where mp.user_id = auth.uid()
        and mp.portal_access_enabled = true
    )
  );

grant delete on public.member_course_rounds to authenticated;
