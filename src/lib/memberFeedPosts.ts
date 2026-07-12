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
import { fetchPhotosForRoundIds } from "./memberCourseRoundPhotos";
import { formatPlayedOnDate } from "./memberCourseRounds";
import { formatCourseRatingDisplay, validateCourseRating } from "./courseRating";
import {
  validateCourseRoundPostEditInput,
  validateTextPostEditInput,
} from "./feedPostEditing";
import { supabase } from "./supabase";

const FEED_PAGE_SIZE = 20;

export type MemberFeedCursor = {
  createdAt: string;
  id: string;
};

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
  const roundIds = [
    ...new Set(
      records
        .map((record) => record.member_course_round_id)
        .filter((value): value is string => Boolean(value)),
    ),
  ];

  const { data: roundPhotos } = await fetchPhotosForRoundIds(roundIds);
  const imagesByRoundId = new Map<string, string[]>();

  for (const photo of roundPhotos ?? []) {
    if (!photo.signed_url) continue;
    const existing = imagesByRoundId.get(photo.member_course_round_id) ?? [];
    existing.push(photo.signed_url);
    imagesByRoundId.set(photo.member_course_round_id, existing);
  }

  return records.map((record) => {
    const profile = normalizeAuthorProfile(
      rows.find((row) => String((row as { id?: string }).id ?? "") === record.id)?.member_profiles,
    );
    const imageUrls = record.member_course_round_id
      ? imagesByRoundId.get(record.member_course_round_id) ?? []
      : [];

    return memberFeedPostToFeedPost(record, profile, imageUrls);
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
  const posts = await mapRowsToFeedPosts(feedRows);
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

  return {
    data: await mapRowsToFeedPosts((data ?? []) as MemberFeedPostWithProfile[]),
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
    const { data: photos } = await fetchPhotosForRoundIds([record.member_course_round_id]);
    imageUrls = (photos ?? [])
      .map((photo) => photo.signed_url)
      .filter((url): url is string => Boolean(url));
  }

  return {
    data: memberFeedPostToFeedPost(record, authorProfile, imageUrls),
    error: null,
  };
}

export async function createCourseRoundFeedPost({
  roundId,
  courseName,
  location,
  note,
  wouldPlayAgain,
  playedOn,
  courseRating,
}: {
  roundId: string;
  courseName: string;
  location: string;
  note: string;
  wouldPlayAgain: boolean;
  playedOn: string;
  courseRating: number;
}) {
  const message = note.trim() || `Played ${courseName.trim()}`;
  const ratingDisplay = formatCourseRatingDisplay(courseRating);

  return createMemberFeedPost(
    {
      composerPostType: "round-review",
      message,
      headline: courseName.trim(),
      badge: experienceCopy.feedBadge,
      details: [
        { label: "Location", value: location.trim() },
        { label: "Played", value: formatPlayedOnDate(playedOn) },
        ...(ratingDisplay
          ? [{ label: "Course Rating", value: `${ratingDisplay}/10.0` }]
          : []),
        { label: "Would play again", value: wouldPlayAgain ? "Yes" : "No" },
      ],
      internalPostType: "course-review",
      rating: courseRating,
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
    const { data: photos } = await fetchPhotosForRoundIds([record.member_course_round_id]);
    imageUrls = (photos ?? [])
      .map((photo) => photo.signed_url)
      .filter((url): url is string => Boolean(url));
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

export async function updateCourseRoundFeedPost(
  postId: string,
  input: {
    message: string;
    courseRating: number;
    playedOn: string;
    wouldPlayAgain: boolean;
    location: string;
  },
) {
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

  const ratingResult = validateCourseRating(input.courseRating);
  if (!ratingResult.ok) {
    return { data: null, error: new Error(ratingResult.message) };
  }

  const { data, error } = await supabase.rpc("edit_course_round_feed_post", {
    p_post_id: postId,
    p_message: input.message.trim(),
    p_course_rating: ratingResult.value,
    p_played_on: input.playedOn,
    p_would_play_again: input.wouldPlayAgain,
    p_location: input.location.trim(),
  });

  if (error) {
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
