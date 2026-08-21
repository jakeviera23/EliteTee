import type { FeedPost } from "../data/portalSocial";
import { getCurrentAuthUserId } from "./authUserLinking";
import {
  findOrCreateMemberGolfCourse,
  normalizeGolfCourseNameKey,
  resolveExistingGolfCourseForExperience,
} from "./golfCourses";
import { submitMemberCourseRound } from "./memberCourseRounds";
import { logSupabaseOperation } from "./supabaseOperationLog";
import { supabase } from "./supabase";

export type EnsureExperienceRoundResult = {
  postId: string;
  memberCourseRoundId: string | null;
  golfCourseId?: string | null;
  action:
    | "already_linked"
    | "linked_existing"
    | "created_round"
    | "ambiguous"
    | "skipped_not_experience"
    | "error";
  detail: string;
};

type ParsedExperienceContent = {
  courseName: string;
  location: string;
  playedOn: string;
  courseRating: number;
  wouldPlayAgain: boolean;
  note: string;
};

function detailValue(
  details: Array<{ label?: string; value?: string }> | undefined,
  labels: string[],
): string | null {
  if (!details?.length) return null;
  const wanted = new Set(labels.map((label) => label.toLowerCase()));
  for (const detail of details) {
    const label = (detail.label ?? "").trim().toLowerCase();
    if (wanted.has(label) && detail.value?.trim()) {
      return detail.value.trim();
    }
  }
  return null;
}

function parsePlayedOn(raw: string | null): string {
  if (!raw) return new Date().toISOString().slice(0, 10);
  const asIso = Date.parse(raw);
  if (!Number.isNaN(asIso)) {
    return new Date(asIso).toISOString().slice(0, 10);
  }
  const parsed = new Date(`${raw}T12:00:00`);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

function parseRating(raw: string | null, fallback: number | null | undefined): number {
  if (typeof fallback === "number" && Number.isFinite(fallback)) return fallback;
  if (!raw) return 10;
  const match = raw.match(/(\d+(?:\.\d+)?)/);
  if (!match) return 10;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : 10;
}

export function normalizeCourseNameKey(name: string): string {
  return normalizeGolfCourseNameKey(name);
}

export function parseExperienceFeedPostContent(content: unknown): ParsedExperienceContent | null {
  let parsed: Record<string, unknown>;
  try {
    parsed =
      typeof content === "string"
        ? (JSON.parse(content) as Record<string, unknown>)
        : (content as Record<string, unknown>);
  } catch {
    return null;
  }

  const details = Array.isArray(parsed.details)
    ? (parsed.details as Array<{ label?: string; value?: string }>)
    : undefined;
  const courseName = String(parsed.headline ?? "").trim() || "Experience";
  const location = detailValue(details, ["Location"]) || "Location not set";
  const playedOn = parsePlayedOn(detailValue(details, ["Played", "Date played", "Played on"]));
  const courseRating = parseRating(
    detailValue(details, ["Course Rating", "Rating"]),
    typeof parsed.rating === "number" ? parsed.rating : Number(parsed.rating),
  );
  const wouldRaw = detailValue(details, ["Would play again"]);
  const wouldPlayAgain =
    wouldRaw == null
      ? true
      : ["yes", "y", "true", "1"].includes(wouldRaw.toLowerCase());

  return {
    courseName,
    location,
    playedOn,
    courseRating,
    wouldPlayAgain,
    note: String(parsed.message ?? "").trim(),
  };
}

function isExperiencePostRow(postType: string | null | undefined, content: string | null | undefined) {
  const type = String(postType ?? "");
  if (type === "course-review" || type === "round-review") return true;
  try {
    const parsed = JSON.parse(content ?? "{}") as Record<string, unknown>;
    return (
      parsed.internalPostType === "course-review" || parsed.composerPostType === "round-review"
    );
  } catch {
    return false;
  }
}

function isExperiencePost(post: Pick<FeedPost, "postType" | "requestLabel">): boolean {
  const postType = String(post.postType ?? "");
  if (postType === "course-review" || postType === "round-review") return true;
  const label = post.requestLabel?.toLowerCase() ?? "";
  return label.includes("experience") || label.includes("round review");
}

async function linkFeedPostToRound(postId: string, roundId: string, userId: string) {
  if (!supabase) {
    return { error: new Error("Supabase is not configured.") };
  }

  const { data, error } = await supabase
    .from("member_feed_posts")
    .update({ member_course_round_id: roundId })
    .eq("id", postId)
    .eq("user_id", userId)
    .is("member_course_round_id", null)
    .select("id, member_course_round_id")
    .maybeSingle();

  if (error) {
    return { error };
  }

  // Another concurrent repair may have linked it already.
  if (!data?.member_course_round_id) {
    const { data: fresh } = await supabase
      .from("member_feed_posts")
      .select("member_course_round_id")
      .eq("id", postId)
      .maybeSingle();
    if (fresh?.member_course_round_id === roundId) {
      return { error: null };
    }
    if (fresh?.member_course_round_id) {
      return { error: null, linkedRoundId: String(fresh.member_course_round_id) };
    }
    return { error: new Error("Feed post round link was not saved.") };
  }
  return { error: null };
}

async function ensureViaClientTables(
  postId: string,
  userId: string,
  meta: ParsedExperienceContent,
): Promise<EnsureExperienceRoundResult> {
  if (!supabase) {
    return {
      postId,
      memberCourseRoundId: null,
      action: "error",
      detail: "Supabase is not configured.",
    };
  }

  const { data: ownerRounds, error: matchError } = await supabase
    .from("member_course_rounds")
    .select("id, course_name, played_on, course_rating, golf_course_id, member_user_id")
    .eq("member_user_id", userId)
    .ilike("course_name", meta.courseName);

  if (matchError) {
    return {
      postId,
      memberCourseRoundId: null,
      action: "error",
      detail: matchError.message,
    };
  }

  const nameKey = normalizeCourseNameKey(meta.courseName);
  const sameName = (ownerRounds ?? []).filter(
    (row) => normalizeCourseNameKey(String(row.course_name ?? "")) === nameKey,
  );

  const dateMatches = sameName.filter((row) => String(row.played_on) === meta.playedOn);
  const ratingMatches = dateMatches.filter(
    (row) => row.course_rating == null || Number(row.course_rating) === meta.courseRating,
  );

  let chosen =
    ratingMatches.length === 1
      ? ratingMatches[0]
      : dateMatches.length === 1
        ? dateMatches[0]
        : sameName.length === 1
          ? sameName[0]
          : null;

  if (!chosen && (dateMatches.length > 1 || sameName.length > 1)) {
    return {
      postId,
      memberCourseRoundId: null,
      action: "ambiguous",
      detail: `Found ${Math.max(dateMatches.length, sameName.length)} candidate rounds; left untouched.`,
    };
  }

  if (chosen) {
    const roundId = String(chosen.id);
    const linkResult = await linkFeedPostToRound(postId, roundId, userId);
    if (linkResult.error) {
      return {
        postId,
        memberCourseRoundId: null,
        action: "error",
        detail: linkResult.error.message,
      };
    }
    return {
      postId,
      memberCourseRoundId: String(linkResult.linkedRoundId ?? roundId),
      golfCourseId: chosen.golf_course_id ? String(chosen.golf_course_id) : null,
      action: "linked_existing",
      detail: "Linked feed post to an unambiguous existing round.",
    };
  }

  // Resolve course first — never blindly insert a duplicate golf_courses row.
  const existingCourse = await resolveExistingGolfCourseForExperience(
    meta.courseName,
    meta.location,
  );

  let golfCourseId = existingCourse?.id ?? null;
  if (!golfCourseId) {
    const { data: linkedCourse, error: linkError } = await findOrCreateMemberGolfCourse(
      meta.courseName,
      meta.location,
    );
    if (linkError || !linkedCourse?.id) {
      return {
        postId,
        memberCourseRoundId: null,
        action: "error",
        detail:
          linkError?.message ??
          "Could not resolve a golf course for this experience without creating a duplicate.",
      };
    }
    golfCourseId = linkedCourse.id;
  }

  const { data: roundData, error: createError } = await submitMemberCourseRound({
    course_name: meta.courseName,
    location: meta.location,
    played_on: meta.playedOn,
    note: meta.note,
    would_play_again: meta.wouldPlayAgain,
    course_rating: meta.courseRating,
    golf_course_id: golfCourseId,
  });

  if (createError || !roundData?.id) {
    // Concurrent repair may have created/linked the round — re-check owner rounds once.
    const { data: retryRounds } = await supabase
      .from("member_course_rounds")
      .select("id, course_name, played_on, course_rating, golf_course_id")
      .eq("member_user_id", userId)
      .ilike("course_name", meta.courseName);

    const retrySameName = (retryRounds ?? []).filter(
      (row) => normalizeCourseNameKey(String(row.course_name ?? "")) === nameKey,
    );
    const retryDate = retrySameName.filter((row) => String(row.played_on) === meta.playedOn);
    const retryChosen =
      retryDate.length === 1 ? retryDate[0] : retrySameName.length === 1 ? retrySameName[0] : null;

    if (retryChosen) {
      const roundId = String(retryChosen.id);
      const linkResult = await linkFeedPostToRound(postId, roundId, userId);
      if (!linkResult.error) {
        return {
          postId,
          memberCourseRoundId: String(linkResult.linkedRoundId ?? roundId),
          golfCourseId: retryChosen.golf_course_id ? String(retryChosen.golf_course_id) : golfCourseId,
          action: "linked_existing",
          detail: "Linked feed post to an existing round after a create race.",
        };
      }
    }

    return {
      postId,
      memberCourseRoundId: null,
      action: "error",
      detail: createError?.message ?? "Could not create a course round for this experience.",
    };
  }

  const linkResult = await linkFeedPostToRound(postId, roundData.id, userId);
  if (linkResult.error) {
    return {
      postId,
      memberCourseRoundId: roundData.id,
      golfCourseId,
      action: "error",
      detail: `Round created (${roundData.id}) but feed link failed: ${linkResult.error.message}`,
    };
  }

  return {
    postId,
    memberCourseRoundId: String(linkResult.linkedRoundId ?? roundData.id),
    golfCourseId,
    action: "created_round",
    detail: existingCourse
      ? "Created round for existing course and linked feed post."
      : "Created round and linked feed post.",
  };
}

/**
 * Ensures an experience feed post has member_course_round_id.
 * Prefers migration 062 RPC when available; falls back to client-side repair.
 * Always re-reads the feed post from the DB so stale client state cannot re-create courses.
 */
export async function ensureMemberCourseRoundForFeedPost(
  post: Pick<
    FeedPost,
    | "id"
    | "memberCourseRoundId"
    | "postType"
    | "requestLabel"
    | "courseName"
    | "caption"
    | "details"
    | "rating"
  >,
): Promise<{ data: EnsureExperienceRoundResult | null; error: Error | null }> {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const { userId, error: sessionError } = await getCurrentAuthUserId();
  if (sessionError || !userId) {
    return {
      data: null,
      error: sessionError ?? new Error("You must be signed in to repair this experience."),
    };
  }

  // Authoritative linkage comes from the database, not the in-memory feed card.
  const { data: freshPost, error: freshError } = await supabase
    .from("member_feed_posts")
    .select("id, user_id, post_type, content, member_course_round_id")
    .eq("id", post.id)
    .maybeSingle();

  if (freshError) {
    return { data: null, error: freshError };
  }
  if (!freshPost) {
    return { data: null, error: new Error("Post not found.") };
  }
  if (String(freshPost.user_id) !== userId) {
    return { data: null, error: new Error("You can only repair your own experience posts.") };
  }

  if (freshPost.member_course_round_id) {
    const roundId = String(freshPost.member_course_round_id);
    const { data: round } = await supabase
      .from("member_course_rounds")
      .select("id, golf_course_id")
      .eq("id", roundId)
      .maybeSingle();

    if (round?.id) {
      return {
        data: {
          postId: post.id,
          memberCourseRoundId: roundId,
          golfCourseId: round.golf_course_id ? String(round.golf_course_id) : null,
          action: "already_linked",
          detail: "Feed post already has a valid round link.",
        },
        error: null,
      };
    }
  }

  if (
    !isExperiencePost(post) &&
    !isExperiencePostRow(freshPost.post_type, freshPost.content)
  ) {
    return {
      data: {
        postId: post.id,
        memberCourseRoundId: null,
        action: "skipped_not_experience",
        detail: "Post is not a course experience.",
      },
      error: null,
    };
  }

  const rpc = await supabase.rpc("ensure_member_course_round_for_feed_post", {
    p_post_id: post.id,
  });

  if (!rpc.error) {
    const row = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;
    if (row) {
      const action = String(row.action ?? "error") as EnsureExperienceRoundResult["action"];
      const result: EnsureExperienceRoundResult = {
        postId: String(row.post_id ?? post.id),
        memberCourseRoundId: row.member_course_round_id
          ? String(row.member_course_round_id)
          : null,
        action,
        detail: String(row.detail ?? ""),
      };
      if (action === "error" || action === "ambiguous") {
        return { data: result, error: new Error(result.detail || "Round repair failed.") };
      }
      return { data: result, error: null };
    }
  } else {
    const message = (rpc.error.message ?? "").toLowerCase();
    const missingFn =
      message.includes("ensure_member_course_round_for_feed_post") ||
      message.includes("could not find the function") ||
      rpc.error.code === "PGRST202";
    if (!missingFn) {
      // Unique-slug / race errors: fall through to client repair which reuses existing rows.
      const isConflict =
        message.includes("golf_courses_slug_key") ||
        message.includes("duplicate key") ||
        message.includes("unique constraint");
      if (!isConflict) {
        logSupabaseOperation("ensure_member_course_round_for_feed_post", rpc.error, {
          postId: post.id,
        });
        return { data: null, error: rpc.error };
      }
    }
  }

  const meta =
    parseExperienceFeedPostContent(freshPost.content) ??
    parseExperienceFeedPostContent({
      headline: post.courseName,
      message: post.caption,
      details: post.details,
      rating: post.rating,
    });

  if (!meta) {
    return {
      data: null,
      error: new Error("Could not parse this experience post to restore its round link."),
    };
  }

  const repaired = await ensureViaClientTables(post.id, userId, meta);
  if (repaired.action === "error" || repaired.action === "ambiguous") {
    return { data: repaired, error: new Error(repaired.detail) };
  }
  return { data: repaired, error: null };
}
