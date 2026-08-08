import { getCurrentUserId } from "./api/members";
import { resolveMemberMediaUrl, resolveMemberMediaUrlMap } from "./api/memberProfileMedia";
import { requireSupabase } from "./supabase";
import type { MobileFeedComment } from "@/types/feed";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_COMMENT_LENGTH = 1000;

type EngagementRow = { post_id: string };

type CommentRow = {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

export type FeedEngagementState = {
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  isSaved: boolean;
};

export function isPersistedFeedPostId(postId: string) {
  return UUID_PATTERN.test(postId.trim());
}

export function filterPersistedFeedPostIds(postIds: string[]) {
  return [...new Set(postIds.map((postId) => postId.trim()).filter(isPersistedFeedPostId))];
}

export function formatFeedEngagementError(error: unknown): string {
  if (!error) return "Engagement request failed.";
  if (error instanceof Error) return error.message;
  const message =
    typeof error === "object" && error && "message" in error
      ? String((error as { message?: string }).message ?? "")
      : "";
  return message || "Engagement request failed.";
}

export function validateFeedPostCommentBody(body: string) {
  const trimmed = body.trim();
  if (!trimmed) {
    return { ok: false as const, message: "Comment cannot be empty." };
  }
  if (trimmed.length > MAX_COMMENT_LENGTH) {
    return {
      ok: false as const,
      message: `Comment must be ${MAX_COMMENT_LENGTH} characters or fewer.`,
    };
  }
  return { ok: true as const, value: trimmed };
}

export function applyLikeToggle({ liked, likeCount }: { liked: boolean; likeCount: number }) {
  return {
    liked: !liked,
    likeCount: Math.max(0, likeCount + (liked ? -1 : 1)),
  };
}

export function applySaveToggle(saved: boolean) {
  return !saved;
}

function isDuplicateEngagementError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  if (error.code === "23505") return true;
  return error.message?.toLowerCase().includes("duplicate key") ?? false;
}

function formatCommentTimestamp(value: string) {
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

async function loadCommentAuthors(userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, { full_name: string; club_logo_url: string | null }>();
  }

  const client = requireSupabase();
  const { data } = await client
    .from("member_profiles")
    .select("user_id, full_name, club_logo_url")
    .in("user_id", userIds)
    .eq("portal_access_enabled", true);

  return new Map(
    (data ?? [])
      .filter((profile) => profile.user_id)
      .map((profile) => [
        String(profile.user_id),
        {
          full_name: String(profile.full_name ?? "Member"),
          club_logo_url: profile.club_logo_url ? String(profile.club_logo_url) : null,
        },
      ]),
  );
}

async function mapCommentRow(
  row: CommentRow,
  author?: { full_name: string; club_logo_url: string | null },
): Promise<MobileFeedComment> {
  const avatarUrl = author?.club_logo_url
    ? await resolveMemberMediaUrl(author.club_logo_url)
    : null;

  return {
    id: row.id,
    postId: row.post_id,
    userId: row.user_id,
    authorName: author?.full_name?.trim() || "Member",
    authorAvatarUrl: avatarUrl,
    body: row.body,
    createdAt: row.created_at,
    displayTimestamp: formatCommentTimestamp(row.created_at),
  };
}

export async function fetchFeedEngagementForPosts(
  postIds: string[],
  viewerUserId?: string | null,
): Promise<{ summaries: Map<string, FeedEngagementState>; error: Error | null }> {
  const normalizedPostIds = filterPersistedFeedPostIds(postIds);
  const summaries = new Map<string, FeedEngagementState>();

  for (const postId of normalizedPostIds) {
    summaries.set(postId, {
      likeCount: 0,
      commentCount: 0,
      isLiked: false,
      isSaved: false,
    });
  }

  if (normalizedPostIds.length === 0) {
    return { summaries, error: null };
  }

  const client = requireSupabase();

  const [likesResult, commentsResult, viewerLikesResult, viewerSavesResult] = await Promise.all([
    client.from("feed_post_likes").select("post_id").in("post_id", normalizedPostIds),
    client.from("feed_post_comments").select("post_id").in("post_id", normalizedPostIds),
    viewerUserId
      ? client
          .from("feed_post_likes")
          .select("post_id")
          .in("post_id", normalizedPostIds)
          .eq("user_id", viewerUserId)
      : Promise.resolve({ data: [] as EngagementRow[], error: null }),
    viewerUserId
      ? client
          .from("feed_post_saves")
          .select("post_id")
          .in("post_id", normalizedPostIds)
          .eq("user_id", viewerUserId)
      : Promise.resolve({ data: [] as EngagementRow[], error: null }),
  ]);

  if (likesResult.error) {
    return { summaries, error: likesResult.error };
  }
  if (commentsResult.error) {
    return { summaries, error: commentsResult.error };
  }

  const viewerLikeIds = new Set(
    ((viewerLikesResult.data ?? []) as EngagementRow[]).map((row) => row.post_id),
  );
  const viewerSaveIds = new Set(
    ((viewerSavesResult.data ?? []) as EngagementRow[]).map((row) => row.post_id),
  );

  for (const postId of normalizedPostIds) {
    const existing = summaries.get(postId);
    if (!existing) continue;
    existing.isLiked = viewerLikeIds.has(postId);
    existing.isSaved = viewerSaveIds.has(postId);
  }

  for (const row of (likesResult.data ?? []) as EngagementRow[]) {
    const summary = summaries.get(row.post_id);
    if (summary) summary.likeCount += 1;
  }

  const commentRows = (commentsResult.data ?? []) as EngagementRow[];
  for (const row of commentRows) {
    const summary = summaries.get(row.post_id);
    if (summary) summary.commentCount += 1;
  }

  return { summaries, error: null };
}

export async function fetchFeedPostComments(postId: string) {
  if (!isPersistedFeedPostId(postId)) {
    return { data: [] as MobileFeedComment[], error: null };
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("feed_post_comments")
    .select("id, post_id, user_id, body, created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    return { data: [] as MobileFeedComment[], error };
  }

  const rows = (data ?? []) as CommentRow[];
  const authorsByUserId = await loadCommentAuthors([
    ...new Set(rows.map((row) => row.user_id)),
  ]);
  const avatarPaths = rows.map((row) => authorsByUserId.get(row.user_id)?.club_logo_url);
  const resolvedAvatars = await resolveMemberMediaUrlMap(avatarPaths);

  const comments = rows.map((row) => {
    const author = authorsByUserId.get(row.user_id);
    const stored = author?.club_logo_url?.trim() ?? "";
    const avatarUrl = stored
      ? /^https?:\/\//i.test(stored)
        ? stored
        : resolvedAvatars.get(stored) ?? null
      : null;

    return {
      id: row.id,
      postId: row.post_id,
      userId: row.user_id,
      authorName: author?.full_name?.trim() || "Member",
      authorAvatarUrl: avatarUrl,
      body: row.body,
      createdAt: row.created_at,
      displayTimestamp: formatCommentTimestamp(row.created_at),
    } satisfies MobileFeedComment;
  });

  return { data: comments, error: null };
}

export async function toggleFeedPostLike(postId: string, currentlyLiked: boolean) {
  const { userId, error: sessionError } = await getCurrentUserId();
  if (sessionError || !userId) {
    return {
      liked: currentlyLiked,
      error: sessionError ?? new Error("You must be signed in to appreciate posts."),
    };
  }

  if (!isPersistedFeedPostId(postId)) {
    return { liked: currentlyLiked, error: new Error("This post cannot be appreciated.") };
  }

  const client = requireSupabase();

  if (currentlyLiked) {
    const { error } = await client
      .from("feed_post_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", userId);
    return { liked: false, error: error ?? null };
  }

  const { error } = await client.from("feed_post_likes").insert({
    post_id: postId,
    user_id: userId,
  });

  if (error && isDuplicateEngagementError(error)) {
    return { liked: true, error: null };
  }

  return { liked: !error, error: error ?? null };
}

export async function toggleFeedPostSave(postId: string, currentlySaved: boolean) {
  const { userId, error: sessionError } = await getCurrentUserId();
  if (sessionError || !userId) {
    return {
      saved: currentlySaved,
      error: sessionError ?? new Error("You must be signed in to save posts."),
    };
  }

  if (!isPersistedFeedPostId(postId)) {
    return { saved: currentlySaved, error: new Error("This post cannot be saved.") };
  }

  const client = requireSupabase();

  if (currentlySaved) {
    const { error } = await client
      .from("feed_post_saves")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", userId);
    return { saved: false, error: error ?? null };
  }

  const { error } = await client.from("feed_post_saves").insert({
    post_id: postId,
    user_id: userId,
  });

  if (error && isDuplicateEngagementError(error)) {
    return { saved: true, error: null };
  }

  return { saved: !error, error: error ?? null };
}

export async function createFeedPostComment(postId: string, body: string) {
  const validation = validateFeedPostCommentBody(body);
  if (!validation.ok) {
    return { data: null, error: new Error(validation.message) };
  }

  const { userId, error: sessionError } = await getCurrentUserId();
  if (sessionError || !userId) {
    return {
      data: null,
      error: sessionError ?? new Error("You must be signed in to comment."),
    };
  }

  if (!isPersistedFeedPostId(postId)) {
    return { data: null, error: new Error("This post cannot be commented on.") };
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("feed_post_comments")
    .insert({
      post_id: postId,
      user_id: userId,
      body: validation.value,
    })
    .select("id, post_id, user_id, body, created_at")
    .single();

  if (error || !data) {
    return {
      data: null,
      error: error ?? new Error("Comment could not be posted."),
    };
  }

  const authorsByUserId = await loadCommentAuthors([userId]);
  const comment = await mapCommentRow(data as CommentRow, authorsByUserId.get(userId));
  return { data: comment, error: null };
}
