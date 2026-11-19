import { fetchOwnProfile, getCurrentUserId } from "./members";
import { requireSupabase } from "../supabase";
import { formatCourseRatingDisplay } from "../courseRating";
import { formatPlayedOnDate } from "./courseRounds";

export type ComposerPostType =
  | "general"
  | "round-review"
  | "looking-for-game"
  | "traveling";

export type MemberFeedPostPayload = {
  composerPostType: ComposerPostType;
  message: string;
  headline?: string;
  badge?: string;
  details?: { label: string; value: string }[];
  internalPostType: "played-today" | "course-review" | "golf-travel";
  rating?: number;
  playedWith?: string;
};

const POST_TYPE_TO_DB: Record<ComposerPostType, string> = {
  general: "general",
  "round-review": "round-review",
  "looking-for-game": "looking-for-game",
  traveling: "traveling",
};

const FEED_POST_SELECT = `
  id,
  user_id,
  member_profile_id,
  member_course_round_id,
  content,
  post_type,
  created_at
`;

function serializeFeedPostContent(payload: MemberFeedPostPayload): string {
  return JSON.stringify(payload);
}

export async function createMemberFeedPost(
  payload: MemberFeedPostPayload,
  memberCourseRoundId?: string | null,
): Promise<{ data: { id: string } | null; error: Error | null }> {
  const { userId, error: sessionError } = await getCurrentUserId();
  if (sessionError || !userId) {
    return { data: null, error: sessionError ?? new Error("You must be signed in to post.") };
  }

  const { data: profile, error: profileError } = await fetchOwnProfile();
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

  const client = requireSupabase();
  const { data, error } = await client
    .from("member_feed_posts")
    .insert(insertPayload)
    .select(FEED_POST_SELECT)
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data: { id: String(data.id) }, error: null };
}

export async function createGeneralFeedPost(message: string) {
  return createMemberFeedPost({
    composerPostType: "general",
    message: message.trim(),
    internalPostType: "played-today",
    badge: "Update",
  });
}

export async function createComposerFeedPost(payload: MemberFeedPostPayload) {
  return createMemberFeedPost(payload);
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
      badge: "Experience",
      details,
      internalPostType: "course-review",
      rating: courseRating,
      playedWith: playedWith?.trim() || undefined,
    },
    roundId,
  );
}

export async function fetchMemberFeedPostForRound(roundId: string) {
  const { userId, error: sessionError } = await getCurrentUserId();
  if (sessionError || !userId) {
    return { data: null, error: sessionError ?? new Error("You must be signed in.") };
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("member_feed_posts")
    .select("id")
    .eq("member_course_round_id", roundId.trim())
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  return { data: data ? { id: String(data.id) } : null, error: null };
}
