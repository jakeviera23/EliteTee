import type { ComposerPostType, FeedPost, PortalGolfer } from "../data/portalSocial";
import { composerPostTypeBadges } from "../data/portalSocial";
import type {
  MemberFeedPostAuthorProfile,
  MemberFeedPostPayload,
  MemberFeedPostRecord,
  MemberFeedPostWithProfile,
} from "../types/memberFeedPost";
import { getCurrentAuthUserId } from "./authUserLinking";
import { fetchOwnMemberProfile } from "./memberProfiles";
import { supabase } from "./supabase";

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

function normalizeFeedPostRow(row: Record<string, unknown>): MemberFeedPostRecord {
  return {
    id: String(row.id ?? ""),
    user_id: String(row.user_id ?? ""),
    member_profile_id: row.member_profile_id ? String(row.member_profile_id) : null,
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
): FeedPost {
  const parsed = parseFeedPostContent(row.content);
  const composerType = DB_TYPE_TO_COMPOSER[row.post_type] ?? parsed.composerPostType;
  const badge = parsed.badge ?? composerPostTypeBadges[composerType];

  return {
    id: row.id,
    postType: parsed.internalPostType,
    author: profileToPortalGolfer(profile, row.user_id),
    courseName: parsed.headline || badge,
    courseLocation: profile?.based_in ?? "",
    images: [],
    imageAlt: parsed.headline ? `${badge}: ${parsed.headline}` : badge,
    caption: parsed.message,
    likes: 0,
    comments: 0,
    timestamp: formatFeedTimestamp(row.created_at),
    requestLabel: badge,
    details: parsed.details,
    rating: parsed.rating,
    playedWith: parsed.playedWith,
  };
}

function mapRowsToFeedPosts(rows: MemberFeedPostWithProfile[]): FeedPost[] {
  return rows.map((row) => {
    const record = normalizeFeedPostRow(row as unknown as Record<string, unknown>);
    const profile = normalizeAuthorProfile(row.member_profiles);
    return memberFeedPostToFeedPost(record, profile);
  });
}

export async function fetchMemberFeedPosts() {
  if (!supabase) {
    return { data: [] as FeedPost[], error: new Error("Supabase is not configured.") };
  }

  const { data, error } = await supabase
    .from("member_feed_posts")
    .select(
      `
      id,
      user_id,
      member_profile_id,
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
    `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    return { data: [] as FeedPost[], error };
  }

  return {
    data: mapRowsToFeedPosts((data ?? []) as MemberFeedPostWithProfile[]),
    error: null,
  };
}

export async function fetchMemberFeedPostsForCurrentUser() {
  if (!supabase) {
    return { data: [] as FeedPost[], error: new Error("Supabase is not configured.") };
  }

  const { userId, error: sessionError } = await getCurrentAuthUserId();
  if (sessionError || !userId) {
    return {
      data: [] as FeedPost[],
      error: sessionError ?? new Error("You must be signed in to view your posts."),
    };
  }

  const { data, error } = await supabase
    .from("member_feed_posts")
    .select(
      `
      id,
      user_id,
      member_profile_id,
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
    `,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return { data: [] as FeedPost[], error };
  }

  return {
    data: mapRowsToFeedPosts((data ?? []) as MemberFeedPostWithProfile[]),
    error: null,
  };
}

export async function createMemberFeedPost(payload: MemberFeedPostPayload) {
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

  const insertPayload = {
    user_id: userId,
    member_profile_id: profile?.id ?? null,
    content: serializeFeedPostContent(payload),
    post_type: POST_TYPE_TO_DB[payload.composerPostType] ?? "general",
  };

  const { data, error } = await supabase
    .from("member_feed_posts")
    .insert(insertPayload)
    .select(
      `
      id,
      user_id,
      member_profile_id,
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
    `,
    )
    .single();

  if (error) {
    return { data: null, error };
  }

  const record = normalizeFeedPostRow(data as Record<string, unknown>);
  const authorProfile = normalizeAuthorProfile(
    (data as MemberFeedPostWithProfile).member_profiles,
  );

  return {
    data: memberFeedPostToFeedPost(record, authorProfile),
    error: null,
  };
}
