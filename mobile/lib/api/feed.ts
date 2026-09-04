import { requireSupabase } from "../supabase";
import {
  buildRoundImageUrls,
  fetchCoverPhotoIdsForRoundIds,
  fetchPhotosForRoundIds,
} from "./courseRoundPhotos";
import { getCurrentUserId } from "./members";
import { fetchFeedEngagementForPosts } from "../feedPostEngagement";
import { formatPrimaryClubLine } from "../display";
import { getMemberDisplayName } from "../memberInitials";
import type { MobileFeedPage, MobileFeedPost } from "@/types/feed";

const COMPOSER_BADGES: Record<string, string> = {
  intro: "Introduction",
  introduction: "Introduction",
  "round-review": "Round Review",
  "looking-for-game": "Looking for a Game",
  traveling: "Traveling",
  "business-golf": "Business Golf",
  general: "Update",
};

const DEFAULT_ENGAGEMENT = {
  likeCount: 0,
  commentCount: 0,
  isLiked: false,
  isSaved: false,
};

function formatFeedTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
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

function parseFeedDetails(value: unknown): { label: string; value: string }[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const details = value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const row = entry as Record<string, unknown>;
      const label = typeof row.label === "string" ? row.label.trim() : "";
      const detailValue = typeof row.value === "string" ? row.value.trim() : "";
      if (!label || !detailValue) return null;
      return { label, value: detailValue };
    })
    .filter((entry): entry is { label: string; value: string } => Boolean(entry));

  return details.length > 0 ? details : undefined;
}

function parseFeedContent(content: string): {
  message: string;
  headline?: string;
  badge?: string;
  composerPostType?: string;
  rating?: number;
  playedWith?: string;
  details?: { label: string; value: string }[];
} {
  try {
    const parsed = JSON.parse(content) as {
      message?: string;
      headline?: string;
      badge?: string;
      composerPostType?: string;
      rating?: number;
      playedWith?: string;
      details?: unknown;
    };

    if (parsed && typeof parsed.message === "string") {
      return {
        message: parsed.message,
        headline: parsed.headline,
        badge: parsed.badge,
        composerPostType: parsed.composerPostType,
        rating: parsed.rating,
        playedWith: parsed.playedWith,
        details: parseFeedDetails(parsed.details),
      };
    }
  } catch {
    // Plain-text legacy content.
  }

  return { message: content };
}

function mapRpcRowToPost(row: Record<string, unknown>): MobileFeedPost {
  const parsed = parseFeedContent(String(row.content ?? ""));
  const postType = String(row.post_type ?? "general");
  const badge = parsed.badge ?? COMPOSER_BADGES[postType] ?? "Update";

  return {
    id: String(row.id ?? ""),
    authorUserId: String(row.user_id ?? ""),
    authorName: getMemberDisplayName(String(row.full_name ?? "")) || "Member",
    authorClub: formatPrimaryClubLine(String(row.primary_club ?? "")),
    authorLocation: String(row.based_in ?? ""),
    authorAvatarUrl: row.club_logo_url ? String(row.club_logo_url) : null,
    badge,
    headline: String(parsed.headline ?? badge),
    message: String(parsed.message ?? ""),
    timestamp: formatFeedTimestamp(String(row.created_at ?? "")),
    createdAt: String(row.created_at ?? ""),
    imageUrls: [],
    details: parsed.details,
    rating: typeof parsed.rating === "number" ? parsed.rating : undefined,
    playedWith: parsed.playedWith,
    memberCourseRoundId: row.member_course_round_id
      ? String(row.member_course_round_id)
      : undefined,
    golfCourseId: row.golf_course_id ? String(row.golf_course_id) : undefined,
    courseSlug: row.course_slug ? String(row.course_slug) : undefined,
    ...DEFAULT_ENGAGEMENT,
  };
}

async function fetchRoundCourseLinksByRoundIds(roundIds: string[]) {
  if (roundIds.length === 0) return new Map<string, { golfCourseId: string; courseSlug: string }>();

  const client = requireSupabase();
  const { data: rounds } = await client
    .from("member_course_rounds")
    .select("id, golf_course_id")
    .in("id", roundIds);

  const courseIds = [
    ...new Set(
      (rounds ?? [])
        .map((round) => (round.golf_course_id ? String(round.golf_course_id) : ""))
        .filter(Boolean),
    ),
  ];

  if (courseIds.length === 0) return new Map();

  const { data: courses } = await client
    .from("golf_courses")
    .select("id, slug")
    .in("id", courseIds);

  const slugByCourseId = new Map(
    (courses ?? [])
      .filter((course) => course.id && course.slug)
      .map((course) => [String(course.id), String(course.slug)]),
  );

  const linksByRoundId = new Map<string, { golfCourseId: string; courseSlug: string }>();
  for (const round of rounds ?? []) {
    const roundId = String(round.id ?? "");
    const golfCourseId = round.golf_course_id ? String(round.golf_course_id) : "";
    const courseSlug = golfCourseId ? slugByCourseId.get(golfCourseId) : undefined;
    if (roundId && golfCourseId && courseSlug) {
      linksByRoundId.set(roundId, { golfCourseId, courseSlug });
    }
  }

  return linksByRoundId;
}

async function hydrateAuthorAvatars(posts: MobileFeedPost[]) {
  // Keep canonical storage paths on authorAvatarUrl.
  // MemberAvatar re-signs at render — never bake signed URLs into feed models.
  return posts;
}

async function hydrateFeedPostsWithPhotos(posts: MobileFeedPost[]) {
  const roundIds = [
    ...new Set(
      posts
        .map((post) => post.memberCourseRoundId)
        .filter((roundId): roundId is string => Boolean(roundId?.trim())),
    ),
  ];

  const courseLinksByRoundId = await fetchRoundCourseLinksByRoundIds(roundIds);

  if (roundIds.length === 0) {
    return posts.map((post) => {
      if (!post.memberCourseRoundId) return post;
      const link = courseLinksByRoundId.get(post.memberCourseRoundId);
      if (!link) return post;
      return { ...post, golfCourseId: link.golfCourseId, courseSlug: link.courseSlug };
    });
  }

  const [{ data: photos }, { data: coverPhotoIds }] = await Promise.all([
    fetchPhotosForRoundIds(roundIds),
    fetchCoverPhotoIdsForRoundIds(roundIds),
  ]);

  const photosByRoundId = new Map<string, typeof photos>();
  for (const photo of photos ?? []) {
    const existing = photosByRoundId.get(photo.member_course_round_id) ?? [];
    existing.push(photo);
    photosByRoundId.set(photo.member_course_round_id, existing);
  }

  return posts.map((post) => {
    let next = post;
    if (post.memberCourseRoundId) {
      const link = courseLinksByRoundId.get(post.memberCourseRoundId);
      if (link) {
        next = { ...next, golfCourseId: link.golfCourseId, courseSlug: link.courseSlug };
      }
      const roundPhotos = photosByRoundId.get(post.memberCourseRoundId) ?? [];
      const imageUrls = buildRoundImageUrls(
        roundPhotos,
        coverPhotoIds?.get(post.memberCourseRoundId),
      );
      next = { ...next, imageUrls };
    }
    return next;
  });
}

async function attachEngagement(posts: MobileFeedPost[]) {
  const { userId } = await getCurrentUserId();
  const { summaries, error } = await fetchFeedEngagementForPosts(
    posts.map((post) => post.id),
    userId,
  );

  if (error) {
    console.warn("[feed] engagement load failed", error.message);
    return posts;
  }

  return posts.map((post) => {
    const summary = summaries.get(post.id);
    if (!summary) return post;
    return {
      ...post,
      likeCount: summary.likeCount,
      commentCount: summary.commentCount,
      isLiked: summary.isLiked,
      isSaved: summary.isSaved,
    };
  });
}

async function hydrateFeedPosts(posts: MobileFeedPost[]) {
  const [withPhotosAndAvatars, withEngagement] = await Promise.all([
    hydrateFeedPostsWithPhotos(posts).then(hydrateAuthorAvatars),
    attachEngagement(posts),
  ]);

  const engagementById = new Map(withEngagement.map((post) => [post.id, post]));

  return withPhotosAndAvatars.map((post) => {
    const engagement = engagementById.get(post.id);
    if (!engagement) return post;
    return {
      ...post,
      likeCount: engagement.likeCount,
      commentCount: engagement.commentCount,
      isLiked: engagement.isLiked,
      isSaved: engagement.isSaved,
    };
  });
}

/**
 * Re-resolve round photo signed URLs via the canonical hydrator.
 * Use after reading profile session cache so expired signed URLs are not shown.
 */
export async function resolveFeedPostsMedia(posts: MobileFeedPost[]) {
  if (posts.length === 0) return posts;
  return hydrateFeedPostsWithPhotos(posts);
}

export { stripFeedPostSignedMedia } from "../feedSignedMedia";

export async function fetchMemberFeedPostsForUser(
  userId: string,
  limit = 3,
): Promise<{ data: MobileFeedPost[]; error: Error | null }> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("member_feed_posts")
    .select(
      `id, user_id, post_type, content, created_at, member_course_round_id,
      member_profiles:member_profile_id (full_name, primary_club, based_in, club_logo_url)`,
    )
    .eq("user_id", userId.trim())
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { data: [], error };
  }

  const posts = (data ?? []).map((row) => {
    const rawProfile = row.member_profiles as
      | Record<string, unknown>
      | Record<string, unknown>[]
      | null;
    const profile = Array.isArray(rawProfile) ? rawProfile[0] : rawProfile;
    return mapRpcRowToPost({
      ...(row as Record<string, unknown>),
      full_name: profile?.full_name ?? "Member",
      primary_club: profile?.primary_club ?? "",
      based_in: profile?.based_in ?? "",
      club_logo_url: profile?.club_logo_url ?? null,
    });
  });

  return {
    data: await hydrateFeedPosts(posts),
    error: null,
  };
}

export async function fetchFeedPostById(
  postId: string,
): Promise<{ data: MobileFeedPost | null; error: Error | null }> {
  const client = requireSupabase();
  const normalizedPostId = postId.trim();
  if (!normalizedPostId) {
    return { data: null, error: new Error("Post is unavailable.") };
  }

  const { data: tableRow, error: tableError } = await client
    .from("member_feed_posts")
    .select(
      `id, user_id, post_type, content, created_at, member_course_round_id,
      member_profiles:member_profile_id (full_name, primary_club, based_in, club_logo_url)`,
    )
    .eq("id", normalizedPostId)
    .maybeSingle();

  if (tableError || !tableRow) {
    return { data: null, error: tableError ?? new Error("Post is unavailable.") };
  }

  const rawProfile = tableRow.member_profiles as
    | Record<string, unknown>
    | Record<string, unknown>[]
    | null;
  const profile = Array.isArray(rawProfile) ? rawProfile[0] : rawProfile;
  const post = mapRpcRowToPost({
    ...(tableRow as Record<string, unknown>),
    full_name: profile?.full_name ?? "Member",
    primary_club: profile?.primary_club ?? "",
    based_in: profile?.based_in ?? "",
    club_logo_url: profile?.club_logo_url ?? null,
  });
  const [hydrated] = await hydrateFeedPosts([post]);
  return { data: hydrated ?? null, error: null };
}

export async function fetchFeedPage({
  limit = 20,
  cursor = null,
}: {
  limit?: number;
  cursor?: { createdAt: string; id: string } | null;
} = {}): Promise<{ data: MobileFeedPage; error: Error | null }> {
  const client = requireSupabase();
  const requestLimit = limit + 1;

  const { data, error } = await client.rpc("fetch_member_feed_page", {
    p_cursor_created_at: cursor?.createdAt ?? null,
    p_cursor_id: cursor?.id ?? null,
    p_limit: requestLimit,
  });

  if (error) {
    return {
      data: { posts: [], hasMore: false, nextCursor: null },
      error,
    };
  }

  const rows = (data ?? []) as Record<string, unknown>[];
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const posts = await hydrateFeedPosts(pageRows.map(mapRpcRowToPost));

  const lastRow = pageRows[pageRows.length - 1];
  const nextCursor =
    hasMore && lastRow
      ? {
          createdAt: String(lastRow.created_at ?? ""),
          id: String(lastRow.id ?? ""),
        }
      : null;

  return {
    data: { posts, hasMore, nextCursor },
    error: null,
  };
}
