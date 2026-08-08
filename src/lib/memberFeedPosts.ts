import type { ComposerPostType, FeedPost, PortalGolfer } from "../data/portalSocial";
import { composerPostTypeBadges, experienceCopy } from "../data/portalSocial";
import type {
  MemberFeedPostAuthorProfile,
  MemberFeedPostPayload,
  MemberFeedPostRecord,
  MemberFeedPostWithProfile,
} from "../types/memberFeedPost";
import { getCurrentAuthUserId } from "./authUserLinking";
import { fetchOwnMemberProfile } from "./memberProfiles";
import { fetchPhotosForRoundIds, fetchCoverPhotoIdsForRoundIds, buildRoundImageUrls } from "./memberCourseRoundPhotos";
import { formatPlayedOnDate } from "./memberCourseRounds";
import { formatCourseRatingDisplay, validateCourseRating } from "./courseRating";
import {
  validateCourseRoundPostEditInput,
  validateTextPostEditInput,
  buildCourseRoundEditPayload,
  type CourseRoundPostEditInput,
} from "./feedPostEditing";
import { supabase } from "./supabase";
import { attachFeedPostEngagement } from "./feedPostEngagement";
import { fetchFeedPostMediaForPostIds } from "./feedPostMedia";
import { buildEditCourseRoundFeedPostRpcParams } from "./editCourseRoundFeedPostRpc";
import { logSupabaseOperation } from "./supabaseOperationLog";

const FEED_PAGE_SIZE = 20;

export type MemberFeedCursor = {
  createdAt: string;
  id: string;
};

type RoundCourseLink = {
  golfCourseId: string;
  courseSlug: string;
};

async function fetchRoundCourseLinksByRoundIds(
  roundIds: string[],
): Promise<Map<string, RoundCourseLink>> {
  if (!supabase || roundIds.length === 0) return new Map();

  const { data: rounds, error } = await supabase
    .from("member_course_rounds")
    .select("id, golf_course_id")
    .in("id", roundIds);

  if (error || !rounds?.length) return new Map();

  const courseIds = [
    ...new Set(
      rounds
        .map((round) => (round.golf_course_id ? String(round.golf_course_id) : ""))
        .filter(Boolean),
    ),
  ];

  if (courseIds.length === 0) return new Map();

  const { data: courses } = await supabase
    .from("golf_courses")
    .select("id, slug")
    .in("id", courseIds);

  const slugByCourseId = new Map(
    (courses ?? [])
      .filter((course) => course.id && course.slug)
      .map((course) => [String(course.id), String(course.slug)]),
  );

  const linksByRoundId = new Map<string, RoundCourseLink>();
  for (const round of rounds) {
    const roundId = String(round.id ?? "");
    const golfCourseId = round.golf_course_id ? String(round.golf_course_id) : "";
    const courseSlug = golfCourseId ? slugByCourseId.get(golfCourseId) : undefined;
    if (roundId && golfCourseId && courseSlug) {
      linksByRoundId.set(roundId, { golfCourseId, courseSlug });
    }
  }

  return linksByRoundId;
}

const POST_TYPE_TO_DB: Record<ComposerPostType, string> = {
  introduction: "intro",
  "round-review": "round-review",
  "looking-for-game": "looking-for-game",
  traveling: "traveling",
  "business-golf": "business-golf",
  general: "general",
};

const DB_TYPE_TO_COMPOSER: Record<string, ComposerPostType> = {
  intro: "introduction",
  introduction: "introduction",
  "round-review": "round-review",
  "looking-for-game": "looking-for-game",
  traveling: "traveling",
  "business-golf": "business-golf",
  general: "general",
};

const FEED_POST_SELECT = `
  id,
  user_id,
  member_profile_id,
  member_course_round_id,
  content,
  post_type,
  created_at,
  updated_at,
  member_profiles:member_profile_id (
    full_name,
    primary_club,
    based_in,
    club_logo_url,
    is_verified,
    user_id,
    founding_member_number,
    industry
  )
`;

function normalizeFeedPostRow(row: Record<string, unknown>): MemberFeedPostRecord {
  return {
    id: String(row.id ?? ""),
    user_id: String(row.user_id ?? ""),
    member_profile_id: row.member_profile_id ? String(row.member_profile_id) : null,
    member_course_round_id: row.member_course_round_id
      ? String(row.member_course_round_id)
      : null,
    content: String(row.content ?? ""),
    post_type: String(row.post_type ?? "intro"),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

function normalizeAuthorProfile(
  value: MemberFeedPostAuthorProfile | MemberFeedPostAuthorProfile[] | null | undefined,
): MemberFeedPostAuthorProfile | null {
  if (!value) return null;
  const row = Array.isArray(value) ? value[0] : value;
  if (!row) return null;

  return {
    full_name: String(row.full_name ?? ""),
    primary_club: String(row.primary_club ?? ""),
    based_in: String(row.based_in ?? ""),
    club_logo_url: row.club_logo_url ? String(row.club_logo_url) : null,
    is_verified: Boolean(row.is_verified),
    user_id: row.user_id ? String(row.user_id) : null,
    founding_member_number: row.founding_member_number
      ? String(row.founding_member_number)
      : null,
    industry: String(row.industry ?? ""),
  };
}

export function serializeFeedPostContent(payload: MemberFeedPostPayload): string {
  return JSON.stringify(payload);
}

export function parseFeedPostContent(content: string): MemberFeedPostPayload {
  try {
    const parsed = JSON.parse(content) as Partial<MemberFeedPostPayload>;
    if (parsed && typeof parsed.message === "string" && parsed.internalPostType) {
      return {
        composerPostType: parsed.composerPostType ?? "general",
        message: parsed.message,
        headline: parsed.headline,
        badge: parsed.badge,
        details: parsed.details,
        internalPostType: parsed.internalPostType,
        rating: parsed.rating,
        playedWith: parsed.playedWith,
      };
    }
  } catch {
    // Fall through to plain-text legacy content.
  }

  return {
    composerPostType: "general",
    message: content,
    internalPostType: "played-today",
  };
}

function formatFeedTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

function profileToPortalGolfer(profile: MemberFeedPostAuthorProfile | null, userId: string): PortalGolfer {
  const name = profile?.full_name?.trim() || "Member";

  return {
    id: profile?.user_id ?? userId,
    name,
    handle: name.toLowerCase().replace(/\s+/g, "") || "member",
    location: profile?.based_in ?? "",
    homeCourse: profile?.primary_club ?? "",
    bio: "",
    title: profile?.industry || undefined,
    isVerified: Boolean(profile?.is_verified),
    avatarImage: profile?.club_logo_url?.trim() || undefined,
    followers: 0,
    following: 0,
    coursesPlayed: 0,
    roundsPosted: 0,
    countriesPlayed: 0,
    favoriteCourses: [],
  };
}

export function memberFeedPostToFeedPost(
  row: MemberFeedPostRecord,
  profile: MemberFeedPostAuthorProfile | null,
  imageUrls: string[] = [],
  courseLink?: RoundCourseLink | null,
): FeedPost {
  const parsed = parseFeedPostContent(row.content);
  const composerType = DB_TYPE_TO_COMPOSER[row.post_type] ?? parsed.composerPostType;
  const badge = parsed.badge ?? composerPostTypeBadges[composerType];
  const courseLocation =
    parsed.details?.find((detail) => detail.label === "Location")?.value ??
    profile?.based_in ??
    "";

  return {
    id: row.id,
    postType: parsed.internalPostType,
    author: profileToPortalGolfer(profile, row.user_id),
    courseName: parsed.headline || badge,
    courseLocation,
    images: imageUrls,
    imageAlt: parsed.headline ? `${badge}: ${parsed.headline}` : badge,
    caption: parsed.message,
    likes: 0,
    comments: 0,
    timestamp: formatFeedTimestamp(row.created_at),
    requestLabel: badge,
    details: parsed.details,
    rating: parsed.rating,
    playedWith: parsed.playedWith,
    memberCourseRoundId: row.member_course_round_id ?? undefined,
    authorUserId: row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    golfCourseId: courseLink?.golfCourseId,
    courseSlug: courseLink?.courseSlug,
  };
}

function rpcRowToFeedPostWithProfile(row: Record<string, unknown>): MemberFeedPostWithProfile {
  const profile =
    row.full_name || row.primary_club || row.based_in
      ? {
          full_name: String(row.full_name ?? ""),
          primary_club: String(row.primary_club ?? ""),
          based_in: String(row.based_in ?? ""),
          club_logo_url: row.club_logo_url ? String(row.club_logo_url) : null,
          is_verified: Boolean(row.is_verified),
          user_id: row.profile_user_id ? String(row.profile_user_id) : null,
          founding_member_number: row.founding_member_number
            ? String(row.founding_member_number)
            : null,
          industry: String(row.industry ?? ""),
        }
      : null;

  return {
    id: String(row.id ?? ""),
    user_id: String(row.user_id ?? ""),
    member_profile_id: row.member_profile_id ? String(row.member_profile_id) : null,
    member_course_round_id: row.member_course_round_id
      ? String(row.member_course_round_id)
      : null,
    content: String(row.content ?? ""),
    post_type: String(row.post_type ?? "intro"),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    member_profiles: profile,
  };
}

export function dedupeFeedPosts(posts: FeedPost[]): FeedPost[] {
  const seenIds = new Set<string>();
  const seenRoundIds = new Set<string>();
  const result: FeedPost[] = [];

  for (const post of posts) {
    if (seenIds.has(post.id)) continue;

    if (post.memberCourseRoundId) {
      if (seenRoundIds.has(post.memberCourseRoundId)) continue;
      seenRoundIds.add(post.memberCourseRoundId);
    }

    seenIds.add(post.id);
    result.push(post);
  }

  return result;
}

async function mapRowsToFeedPosts(rows: MemberFeedPostWithProfile[]): Promise<FeedPost[]> {
  const records = rows.map((row) => normalizeFeedPostRow(row as unknown as Record<string, unknown>));
  const postIds = records.map((record) => record.id).filter(Boolean);
  const roundIds = [
    ...new Set(
      records
        .map((record) => record.member_course_round_id)
        .filter((value): value is string => Boolean(value)),
    ),
  ];

  const [roundPhotosResult, coverPhotoIdsResult, feedMediaResult, courseLinksByRoundId] =
    await Promise.all([
    fetchPhotosForRoundIds(roundIds),
    fetchCoverPhotoIdsForRoundIds(roundIds),
    fetchFeedPostMediaForPostIds(postIds),
    fetchRoundCourseLinksByRoundIds(roundIds),
  ]);
  const roundPhotos = roundPhotosResult.data;
  const coverPhotoIds = coverPhotoIdsResult.data;
  const photosByRoundId = new Map<string, typeof roundPhotos>();

  for (const photo of roundPhotos ?? []) {
    const existing = photosByRoundId.get(photo.member_course_round_id) ?? [];
    existing.push(photo);
    photosByRoundId.set(photo.member_course_round_id, existing);
  }

  const imagesByRoundId = new Map<string, string[]>();

  for (const roundId of roundIds) {
    const photos = photosByRoundId.get(roundId) ?? [];
    imagesByRoundId.set(
      roundId,
      buildRoundImageUrls(photos, coverPhotoIds?.get(roundId)),
    );
  }

  const mediaUrlsByPostId = new Map<string, string[]>();
  for (const media of feedMediaResult.data) {
    if (!media.signed_url) continue;
    const existing = mediaUrlsByPostId.get(media.feed_post_id) ?? [];
    existing.push(media.signed_url);
    mediaUrlsByPostId.set(media.feed_post_id, existing);
  }

  return records.map((record) => {
    const profile = normalizeAuthorProfile(
      rows.find((row) => String((row as { id?: string }).id ?? "") === record.id)?.member_profiles,
    );
    const imageUrls = [
      ...(record.member_course_round_id
        ? imagesByRoundId.get(record.member_course_round_id) ?? []
        : []),
      ...(mediaUrlsByPostId.get(record.id) ?? []),
    ];

    const courseLink = record.member_course_round_id
      ? courseLinksByRoundId.get(record.member_course_round_id) ?? null
      : null;

    return memberFeedPostToFeedPost(record, profile, imageUrls, courseLink);
  });
}

export async function fetchMemberFeedPage({
  limit = FEED_PAGE_SIZE,
  cursor = null,
}: {
  limit?: number;
  cursor?: MemberFeedCursor | null;
} = {}) {
  if (!supabase) {
    return {
      data: [] as FeedPost[],
      nextCursor: null as MemberFeedCursor | null,
      hasMore: false,
      error: new Error("Supabase is not configured."),
    };
  }

  const requestLimit = limit + 1;
  const { data, error } = await supabase.rpc("fetch_member_feed_page", {
    p_cursor_created_at: cursor?.createdAt ?? null,
    p_cursor_id: cursor?.id ?? null,
    p_limit: requestLimit,
  });

  if (error) {
    return {
      data: [] as FeedPost[],
      nextCursor: null,
      hasMore: false,
      error,
    };
  }

  const rows = (data ?? []) as Record<string, unknown>[];
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const feedRows = pageRows.map((row) => rpcRowToFeedPostWithProfile(row));
  let posts = await mapRowsToFeedPosts(feedRows);

  const { userId } = await getCurrentAuthUserId();
  const { data: postsWithEngagement, error: engagementError } = await attachFeedPostEngagement(
    posts,
    userId,
  );
  if (!engagementError) {
    posts = postsWithEngagement;
  } else {
    console.error(
      "[memberFeedPosts] failed to load engagement summaries",
      engagementError,
    );
  }

  const lastRow = pageRows[pageRows.length - 1];
  const nextCursor =
    hasMore && lastRow
      ? {
          createdAt: String(lastRow.created_at ?? ""),
          id: String(lastRow.id ?? ""),
        }
      : null;

  return {
    data: posts,
    nextCursor,
    hasMore,
    error: null,
  };
}

export async function fetchMemberFeedPosts() {
  const { data, error } = await fetchMemberFeedPage({ limit: FEED_PAGE_SIZE });
  return { data, error };
}

export async function fetchMemberFeedPostById(postId: string) {
  if (!supabase) {
    return { data: null as FeedPost | null, error: new Error("Supabase is not configured.") };
  }

  const normalizedPostId = postId.trim();
  if (!normalizedPostId) {
    return { data: null as FeedPost | null, error: new Error("Post is unavailable.") };
  }

  const { data, error } = await supabase
    .from("member_feed_posts")
    .select(FEED_POST_SELECT)
    .eq("id", normalizedPostId)
    .maybeSingle();

  if (error || !data) {
    return { data: null as FeedPost | null, error: error ?? new Error("Post is unavailable.") };
  }

  let posts = await mapRowsToFeedPosts([data as MemberFeedPostWithProfile]);
  const { userId } = await getCurrentAuthUserId();
  const engagementResult = await attachFeedPostEngagement(posts, userId);
  if (!engagementResult.error) posts = engagementResult.data;

  return { data: posts[0] ?? null, error: null };
}

export async function fetchMemberFeedPostForRound(roundId: string) {
  if (!supabase) {
    return { data: null as FeedPost | null, error: new Error("Supabase is not configured.") };
  }

  const normalizedRoundId = roundId.trim();
  if (!normalizedRoundId) {
    return { data: null as FeedPost | null, error: null };
  }

  const { userId, error: sessionError } = await getCurrentAuthUserId();
  if (sessionError || !userId) {
    return {
      data: null as FeedPost | null,
      error: sessionError ?? new Error("You must be signed in to view this post."),
    };
  }

  const { data, error } = await supabase
    .from("member_feed_posts")
    .select(FEED_POST_SELECT)
    .eq("member_course_round_id", normalizedRoundId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { data: null as FeedPost | null, error };
  }

  if (!data) {
    return { data: null as FeedPost | null, error: null };
  }

  const posts = await mapRowsToFeedPosts([data as MemberFeedPostWithProfile]);
  return { data: posts[0] ?? null, error: null };
}

export async function fetchMemberFeedPostsForUser(userId: string) {
  if (!supabase) {
    return { data: [] as FeedPost[], error: new Error("Supabase is not configured.") };
  }

  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return { data: [] as FeedPost[], error: new Error("Member posts are unavailable.") };
  }

  const { data, error } = await supabase
    .from("member_feed_posts")
    .select(FEED_POST_SELECT)
    .eq("user_id", normalizedUserId)
    .order("created_at", { ascending: false });

  if (error) {
    return { data: [] as FeedPost[], error };
  }

  let posts = await mapRowsToFeedPosts((data ?? []) as MemberFeedPostWithProfile[]);
  const { userId: viewerUserId } = await getCurrentAuthUserId();
  const { data: postsWithEngagement, error: engagementError } = await attachFeedPostEngagement(
    posts,
    viewerUserId,
  );
  if (!engagementError) {
    posts = postsWithEngagement;
  }

  return {
    data: posts,
    error: null,
  };
}

export async function fetchMemberFeedPostsForCurrentUser() {
  const { userId, error: sessionError } = await getCurrentAuthUserId();
  if (sessionError || !userId) {
    return {
      data: [] as FeedPost[],
      error: sessionError ?? new Error("You must be signed in to view your posts."),
    };
  }

  return fetchMemberFeedPostsForUser(userId);
}

export async function createMemberFeedPost(
  payload: MemberFeedPostPayload,
  memberCourseRoundId?: string | null,
) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const { userId, error: sessionError } = await getCurrentAuthUserId();
  if (sessionError || !userId) {
    return {
      data: null,
      error: sessionError ?? new Error("You must be signed in to post."),
    };
  }

  const { data: profile, error: profileError } = await fetchOwnMemberProfile();
  if (profileError) {
    return { data: null, error: profileError };
  }

  const insertPayload: Record<string, unknown> = {
    user_id: userId,
    member_profile_id: profile?.id ?? null,
    content: serializeFeedPostContent(payload),
    post_type: POST_TYPE_TO_DB[payload.composerPostType] ?? "general",
  };

  if (memberCourseRoundId) {
    insertPayload.member_course_round_id = memberCourseRoundId;
  }

  const { data, error } = await supabase
    .from("member_feed_posts")
    .insert(insertPayload)
    .select(FEED_POST_SELECT)
    .single();

  if (error) {
    return { data: null, error };
  }

  const record = normalizeFeedPostRow(data as Record<string, unknown>);
  const authorProfile = normalizeAuthorProfile(
    (data as MemberFeedPostWithProfile).member_profiles,
  );

  let imageUrls: string[] = [];
  if (record.member_course_round_id) {
    const [{ data: photos }, { data: coverPhotoIds }] = await Promise.all([
      fetchPhotosForRoundIds([record.member_course_round_id]),
      fetchCoverPhotoIdsForRoundIds([record.member_course_round_id]),
    ]);
    imageUrls = buildRoundImageUrls(
      photos ?? [],
      coverPhotoIds?.get(record.member_course_round_id),
    );
  }

  return {
    data: memberFeedPostToFeedPost(record, authorProfile, imageUrls),
    error: null,
  };
}

export async function deleteOwnMemberFeedPost(postId: string) {
  if (!supabase) {
    return { error: new Error("Supabase is not configured.") };
  }

  const normalizedPostId = postId.trim();
  if (!normalizedPostId) {
    return { error: new Error("Post could not be removed.") };
  }

  const { error } = await supabase
    .from("member_feed_posts")
    .delete()
    .eq("id", normalizedPostId);

  return { error };
}

export async function createCourseRoundFeedPost({
  roundId,
  courseName,
  location,
  note,
  wouldPlayAgain,
  playedOn,
  courseRating,
  playedWith,
}: {
  roundId: string;
  courseName: string;
  location: string;
  note: string;
  wouldPlayAgain: boolean;
  playedOn: string;
  courseRating: number;
  playedWith?: string;
}) {
  const message = note.trim() || `Played ${courseName.trim()}`;
  const ratingDisplay = formatCourseRatingDisplay(courseRating);

  const details = [
    ...(location.trim() ? [{ label: "Location", value: location.trim() }] : []),
    { label: "Played", value: formatPlayedOnDate(playedOn) },
    ...(ratingDisplay ? [{ label: "Course Rating", value: `${ratingDisplay}/10.0` }] : []),
    { label: "Would play again", value: wouldPlayAgain ? "Yes" : "No" },
    ...(playedWith?.trim() ? [{ label: "Played with", value: playedWith.trim() }] : []),
  ];

  return createMemberFeedPost(
    {
      composerPostType: "round-review",
      message,
      headline: courseName.trim(),
      badge: experienceCopy.feedBadge,
      details,
      internalPostType: "course-review",
      rating: courseRating,
      playedWith: playedWith?.trim() || undefined,
    },
    roundId,
  );
}

type EditedFeedPostRow = {
  id: string;
  content: string;
  post_type: string;
  created_at: string;
  updated_at: string;
  member_course_round_id: string | null;
  user_id: string;
  member_profiles?: MemberFeedPostAuthorProfile | MemberFeedPostAuthorProfile[] | null;
};

async function mapEditedFeedPostRow(
  row: EditedFeedPostRow,
  existingProfile?: MemberFeedPostAuthorProfile | null,
): Promise<FeedPost> {
  const record = normalizeFeedPostRow(row as unknown as Record<string, unknown>);
  const authorProfile =
    normalizeAuthorProfile(row.member_profiles) ?? existingProfile ?? null;

  let imageUrls: string[] = [];
  if (record.member_course_round_id) {
    const [{ data: photos }, { data: coverPhotoIds }] = await Promise.all([
      fetchPhotosForRoundIds([record.member_course_round_id]),
      fetchCoverPhotoIdsForRoundIds([record.member_course_round_id]),
    ]);
    imageUrls = buildRoundImageUrls(
      photos ?? [],
      coverPhotoIds?.get(record.member_course_round_id),
    );
  }

  return memberFeedPostToFeedPost(record, authorProfile, imageUrls);
}

function profileToFeedAuthorProfile(
  profile: Awaited<ReturnType<typeof fetchOwnMemberProfile>>["data"],
): MemberFeedPostAuthorProfile | null {
  if (!profile) return null;
  return {
    full_name: profile.full_name,
    primary_club: profile.primary_club,
    based_in: profile.based_in,
    club_logo_url: profile.club_logo_url ?? null,
    is_verified: profile.is_verified,
    user_id: profile.user_id,
    founding_member_number: profile.founding_member_number,
    industry: profile.industry,
  };
}

export async function updateMemberFeedPostCaption(postId: string, message: string) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const validation = validateTextPostEditInput({ message });
  if (!validation.ok) {
    return { data: null, error: new Error(validation.message) };
  }

  const { userId, error: sessionError } = await getCurrentAuthUserId();
  if (sessionError || !userId) {
    return {
      data: null,
      error: sessionError ?? new Error("You must be signed in to edit a post."),
    };
  }

  const { data, error } = await supabase.rpc("edit_member_feed_post", {
    p_post_id: postId,
    p_message: message.trim(),
  });

  if (error) {
    logSupabaseOperation("edit_member_feed_post", error, { postId });
    return { data: null, error };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return { data: null, error: new Error("Post could not be updated.") };
  }

  const { data: profile } = await fetchOwnMemberProfile();
  const feedPost = await mapEditedFeedPostRow(
    {
      ...(row as EditedFeedPostRow),
      user_id: userId,
      member_profiles: profileToFeedAuthorProfile(profile),
    },
    null,
  );

  return { data: feedPost, error: null };
}

export async function updateCourseRoundFeedPost(postId: string, input: CourseRoundPostEditInput) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const validation = validateCourseRoundPostEditInput(input);
  if (!validation.ok) {
    return { data: null, error: new Error(validation.message) };
  }

  const { userId, error: sessionError } = await getCurrentAuthUserId();
  if (sessionError || !userId) {
    return {
      data: null,
      error: sessionError ?? new Error("You must be signed in to edit a post."),
    };
  }

  const payload = buildCourseRoundEditPayload(input);
  const ratingResult = validateCourseRating(payload.courseRating);
  if (!ratingResult.ok) {
    return { data: null, error: new Error(ratingResult.message) };
  }

  const rpcParams = buildEditCourseRoundFeedPostRpcParams(postId, payload, ratingResult.value);

  const { data, error } = await supabase.rpc("edit_course_round_feed_post", rpcParams);

  if (error) {
    logSupabaseOperation("edit_course_round_feed_post", error, {
      postId,
      rpcParamKeys: Object.keys(rpcParams),
    });
    return { data: null, error };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return { data: null, error: new Error("Post could not be updated.") };
  }

  const { data: profile } = await fetchOwnMemberProfile();
  const feedPost = await mapEditedFeedPostRow(
    {
      ...(row as EditedFeedPostRow),
      user_id: userId,
      member_profiles: profileToFeedAuthorProfile(profile),
    },
    null,
  );

  return { data: feedPost, error: null };
}

export { FEED_PAGE_SIZE };
