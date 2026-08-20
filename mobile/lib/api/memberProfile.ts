import { attachPhotosToRounds } from "./courseRoundPhotos";
import { attachFeedPostIds } from "./courseRounds";
import { fetchOwnProfile, getCurrentUserId } from "./members";
import { fetchMemberFeedPostsForUser } from "./feed";
import { resolveMemberProfileMedia } from "./memberProfileMedia";
import { requireSupabase } from "../supabase";
import type { MobileFeedPost } from "@/types/feed";
import type { MobileMemberProfile } from "@/types/member";
import type { MobileCourseRoundRecord } from "@/types/courseRoundPhoto";
import { formatGolfCourseLocation } from "@/types/course";

export type BucketListCourseSummary = {
  id: string;
  name: string;
  location: string;
  slug: string;
};

export type MemberProfileIdentity = {
  member: MobileMemberProfile;
  media: { coverImageUrl: string | null; avatarImageUrl: string | null };
};

export type MemberProfileSecondary = {
  courseRounds: MobileCourseRoundRecord[];
  feedPostCount: number;
  connectionCount: number;
  bucketListCourses: BucketListCourseSummary[];
};

export type MemberProfileDetail = MemberProfileIdentity &
  MemberProfileSecondary & {
    recentFeedPosts: MobileFeedPost[];
  };

async function fetchMemberFeedPostCount(userId: string) {
  const client = requireSupabase();
  const { count, error } = await client
    .from("member_feed_posts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  return { count: count ?? 0, error };
}

async function loadBucketListCourseSummaries(courseIds: string[]) {
  const normalizedIds = [...new Set(courseIds.map((id) => id.trim()).filter(Boolean))];
  if (normalizedIds.length === 0) {
    return { data: [] as BucketListCourseSummary[], error: null };
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("golf_courses")
    .select("id, name, slug, city, region, country")
    .in("id", normalizedIds);

  if (error) {
    return { data: [] as BucketListCourseSummary[], error };
  }

  const coursesById = new Map(
    (data ?? []).map((row) => [
      String(row.id),
      {
        id: String(row.id),
        name: String(row.name ?? ""),
        slug: String(row.slug ?? ""),
        city: row.city ? String(row.city) : null,
        region: row.region ? String(row.region) : null,
        country: row.country ? String(row.country) : null,
      },
    ]),
  );

  return {
    data: normalizedIds
      .map((id) => coursesById.get(id))
      .filter((course): course is NonNullable<typeof course> => Boolean(course))
      .map((course) => ({
        id: course.id,
        name: course.name,
        location: formatGolfCourseLocation(course),
        slug: course.slug,
      })),
    error: null,
  };
}

async function fetchIntroductionConnectionCount(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("introduction_requests")
    .select("id")
    .eq("status", "accepted")
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

  if (error) return { count: 0, error };
  return { count: (data ?? []).length, error: null };
}

async function fetchMemberCourseRoundsForUser(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("member_course_rounds")
    .select(
      "id, member_user_id, golf_course_id, course_name, location, played_on, note, would_play_again, course_rating, cover_photo_id, created_at",
    )
    .eq("member_user_id", userId)
    .order("played_on", { ascending: false });

  if (error) {
    return { data: [] as MobileCourseRoundRecord[], error };
  }

  const rounds = (data ?? []).map((row) => ({
    id: String(row.id),
    member_user_id: String(row.member_user_id),
    golf_course_id: row.golf_course_id ? String(row.golf_course_id) : null,
    course_name: String(row.course_name ?? ""),
    location: String(row.location ?? ""),
    played_on: String(row.played_on ?? ""),
    note: String(row.note ?? ""),
    would_play_again: Boolean(row.would_play_again),
    course_rating: Number(row.course_rating ?? 10),
    cover_photo_id: row.cover_photo_id ? String(row.cover_photo_id) : null,
    created_at: String(row.created_at ?? ""),
  }));

  const courseIds = [
    ...new Set(rounds.map((round) => round.golf_course_id).filter(Boolean) as string[]),
  ];

  let slugByCourseId = new Map<string, string>();
  if (courseIds.length > 0) {
    const { data: courses } = await client
      .from("golf_courses")
      .select("id, slug")
      .in("id", courseIds);
    slugByCourseId = new Map(
      (courses ?? []).map((course) => [String(course.id), String(course.slug)]),
    );
  }

  const withSlugs = rounds.map((round) => ({
    ...round,
    course_slug: round.golf_course_id ? slugByCourseId.get(round.golf_course_id) : undefined,
  }));

  try {
    const withFeedPosts = await attachFeedPostIds(withSlugs);
    const withPhotos = await attachPhotosToRounds(withFeedPosts);
    return { data: withPhotos, error: null };
  } catch (hydrateError) {
    console.warn("[memberProfile] round hydration failed", hydrateError);
    return { data: withSlugs, error: null };
  }
}

async function loadMemberRecord(userId: string) {
  const { userId: viewerId } = await getCurrentUserId();
  const isOwnProfile = viewerId === userId;

  const { fetchMemberByUserId } = await import("./members");
  const [{ data: rpcMember, error: memberError }, ownProfileResult] = await Promise.all([
    fetchMemberByUserId(userId),
    isOwnProfile ? fetchOwnProfile() : Promise.resolve({ data: null, error: null }),
  ]);

  if (memberError || !rpcMember) {
    return { member: null, isOwnProfile, error: memberError };
  }

  const member =
    isOwnProfile && ownProfileResult.data
      ? {
          ...rpcMember,
          handicap: ownProfileResult.data.handicap || rpcMember.handicap,
          bucket_list_course_ids:
            ownProfileResult.data.bucket_list_course_ids.length > 0
              ? ownProfileResult.data.bucket_list_course_ids
              : rpcMember.bucket_list_course_ids,
          email: ownProfileResult.data.email || rpcMember.email,
        }
      : rpcMember;

  return { member, isOwnProfile, error: null };
}

export async function fetchMemberProfileIdentity(
  userId: string,
): Promise<{ data: MemberProfileIdentity | null; error: Error | null }> {
  const { member, error } = await loadMemberRecord(userId);
  if (error || !member) {
    return { data: null, error };
  }

  const media = await resolveMemberProfileMedia(member);
  return {
    data: { member, media },
    error: null,
  };
}

export async function fetchMemberProfileSecondary(
  userId: string,
  member: MobileMemberProfile,
  isOwnProfile: boolean,
): Promise<{ data: MemberProfileSecondary | null; error: Error | null }> {
  const [
    { data: courseRounds },
    { count: feedPostCount },
    { count: connectionCount },
    bucketResult,
  ] = await Promise.all([
    fetchMemberCourseRoundsForUser(userId),
    fetchMemberFeedPostCount(userId),
    isOwnProfile ? fetchIntroductionConnectionCount(userId) : Promise.resolve({ count: 0 }),
    isOwnProfile && member.bucket_list_course_ids.length > 0
      ? loadBucketListCourseSummaries(member.bucket_list_course_ids)
      : Promise.resolve({ data: [] as BucketListCourseSummary[], error: null }),
  ]);

  return {
    data: {
      courseRounds,
      feedPostCount: feedPostCount ?? 0,
      connectionCount: connectionCount ?? 0,
      bucketListCourses: bucketResult.data,
    },
    error: null,
  };
}

export async function fetchMemberProfileFeedPosts(userId: string, limit = 3) {
  return fetchMemberFeedPostsForUser(userId, limit);
}

export async function fetchMemberProfileDetail(
  userId: string,
): Promise<{ data: MemberProfileDetail | null; error: Error | null }> {
  const { member, isOwnProfile, error: memberError } = await loadMemberRecord(userId);
  if (memberError || !member) {
    return { data: null, error: memberError };
  }

  const [identity, secondary, { data: recentFeedPosts }] = await Promise.all([
    resolveMemberProfileMedia(member).then((media) => ({ member, media })),
    fetchMemberProfileSecondary(userId, member, isOwnProfile),
    fetchMemberFeedPostsForUser(userId, 3),
  ]);

  if (!secondary.data) {
    return { data: null, error: new Error("Member profile unavailable.") };
  }

  return {
    data: {
      ...identity,
      ...secondary.data,
      recentFeedPosts,
    },
    error: null,
  };
}
