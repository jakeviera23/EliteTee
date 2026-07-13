import type { FeedPost, FeedPostComment } from "../data/portalSocial";
import { getCurrentAuthUserId } from "./authUserLinking";
import {
  buildApprovedMemberIdentityMap,
  fetchApprovedMemberProfilesByUserIds,
} from "./memberProfiles";
import { supabase } from "./supabase";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_COMMENT_LENGTH = 1000;

const ENGAGEMENT_MIGRATION = "043_feed_post_engagement.sql";

export type FeedEngagementSupabaseError = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

export function isMissingEngagementTableError(error: FeedEngagementSupabaseError | null | undefined) {
  if (!error) return false;
  if (error.code === "PGRST205") return true;
  return error.message?.includes("Could not find the table") ?? false;
}

export function logFeedEngagementSupabaseError(context: string, error: unknown) {
  if (!import.meta.env.DEV) return;
  console.error(`[feedPostEngagement] ${context}`, error);
}

export function formatFeedEngagementError(error: unknown): string {
  if (!error) return "Engagement request failed.";

  if (error instanceof Error && !("code" in error)) {
    return error.message;
  }

  const postgrestError = error as FeedEngagementSupabaseError;
  const code = postgrestError.code?.trim();
  const message = postgrestError.message?.trim() || "Engagement request failed.";

  if (isMissingEngagementTableError(postgrestError)) {
    return `Feed engagement tables are missing in Supabase (${code ?? "PGRST205"}). Apply migration ${ENGAGEMENT_MIGRATION}.`;
  }

  if (code === "42501") {
    return `RLS blocked feed engagement (${code}): ${message}`;
  }

  if (code === "23503") {
    return `Feed engagement foreign key failed (${code}): ${message}. user_id must match auth.uid() and exist in public.users.`;
  }

  if (code === "23505") {
    return `Duplicate feed engagement (${code}): ${message}`;
  }

  return code ? `${code}: ${message}` : message;
}

function normalizeSupabaseError(error: unknown) {
  logFeedEngagementSupabaseError("supabase error", error);
  return error;
}

export type FeedPostEngagementSummary = {
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  isSaved: boolean;
  latestComment?: FeedPostComment;
};

type EngagementRow = {
  post_id: string;
};

type CommentRow = {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

export function isPersistedFeedPostId(postId: string) {
  return UUID_PATTERN.test(postId.trim());
}

export function filterPersistedFeedPostIds(postIds: string[]) {
  return [...new Set(postIds.map((postId) => postId.trim()).filter(isPersistedFeedPostId))];
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

export function canDeleteFeedPostComment(
  commentUserId: string,
  currentUserId: string | null | undefined,
) {
  if (!currentUserId) return false;
  return commentUserId.trim() === currentUserId.trim();
}

export function isDuplicateEngagementError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  if (error.code === "23505") return true;
  return error.message?.toLowerCase().includes("duplicate key") ?? false;
}

export function applyLikeToggle({
  liked,
  likeCount,
}: {
  liked: boolean;
  likeCount: number;
}) {
  return {
    liked: !liked,
    likeCount: Math.max(0, likeCount + (liked ? -1 : 1)),
  };
}

export function applySaveToggle(saved: boolean) {
  return !saved;
}

export function buildEngagementSummaryMap({
  postIds,
  likeRows,
  saveRows,
  commentRows,
  viewerLikePostIds,
  viewerSavePostIds,
  commentAuthorsByUserId,
}: {
  postIds: string[];
  likeRows: EngagementRow[];
  saveRows: EngagementRow[];
  commentRows: CommentRow[];
  viewerLikePostIds: Set<string>;
  viewerSavePostIds: Set<string>;
  commentAuthorsByUserId: Record<
    string,
    {
      full_name: string;
      club_logo_url: string | null;
    }
  >;
}) {
  const summaries = new Map<string, FeedPostEngagementSummary>();

  for (const postId of postIds) {
    summaries.set(postId, {
      likeCount: 0,
      commentCount: 0,
      isLiked: viewerLikePostIds.has(postId),
      isSaved: viewerSavePostIds.has(postId),
    });
  }

  for (const row of likeRows) {
    const summary = summaries.get(row.post_id);
    if (summary) summary.likeCount += 1;
  }

  for (const row of saveRows) {
    const summary = summaries.get(row.post_id);
    if (summary) {
      // Save rows are only used for viewer state; counts are not surfaced in UI.
      void row;
    }
  }

  const commentsByPostId = new Map<string, CommentRow[]>();
  for (const row of commentRows) {
    const existing = commentsByPostId.get(row.post_id) ?? [];
    existing.push(row);
    commentsByPostId.set(row.post_id, existing);
  }

  for (const [postId, rows] of commentsByPostId) {
    const summary = summaries.get(postId);
    if (!summary) continue;

    summary.commentCount = rows.length;
    const latest = rows[rows.length - 1];
    if (!latest) continue;

    const author = commentAuthorsByUserId[latest.user_id];
    summary.latestComment = mapCommentRow(latest, author);
  }

  return summaries;
}

export function mergeEngagementIntoFeedPost(
  post: FeedPost,
  summary?: FeedPostEngagementSummary,
): FeedPost {
  if (!summary) return post;

  return {
    ...post,
    likes: summary.likeCount,
    comments: summary.commentCount,
    isLiked: summary.isLiked,
    isSaved: summary.isSaved,
    commentPreview: summary.latestComment
      ? {
          author: summary.latestComment.authorName,
          text: summary.latestComment.body,
        }
      : undefined,
  };
}

function formatCommentTimestamp(value: string) {
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

function mapCommentRow(
  row: CommentRow,
  author?: { full_name: string; club_logo_url: string | null },
): FeedPostComment {
  return {
    id: row.id,
    postId: row.post_id,
    userId: row.user_id,
    authorName: author?.full_name?.trim() || "Member",
    authorAvatarUrl: author?.club_logo_url?.trim() || undefined,
    body: row.body,
    createdAt: row.created_at,
    displayTimestamp: formatCommentTimestamp(row.created_at),
  };
}

async function loadCommentAuthors(userIds: string[]) {
  if (userIds.length === 0) {
    return {} as Record<string, { full_name: string; club_logo_url: string | null }>;
  }

  const { data } = await fetchApprovedMemberProfilesByUserIds(userIds);
  return buildApprovedMemberIdentityMap(data ?? []);
}

export async function fetchFeedPostEngagementSummaries(
  postIds: string[],
  viewerUserId?: string | null,
) {
  const normalizedPostIds = filterPersistedFeedPostIds(postIds);

  if (!supabase || normalizedPostIds.length === 0) {
    return {
      summaries: new Map<string, FeedPostEngagementSummary>(),
      error: null,
    };
  }

  const likeQuery = supabase
    .from("feed_post_likes")
    .select("post_id")
    .in("post_id", normalizedPostIds);

  const commentQuery = supabase
    .from("feed_post_comments")
    .select("id, post_id, user_id, body, created_at")
    .in("post_id", normalizedPostIds)
    .order("created_at", { ascending: true });

  const viewerLikeQuery = viewerUserId
    ? supabase
        .from("feed_post_likes")
        .select("post_id")
        .in("post_id", normalizedPostIds)
        .eq("user_id", viewerUserId)
    : Promise.resolve({ data: [] as EngagementRow[], error: null });

  const viewerSaveQuery = viewerUserId
    ? supabase
        .from("feed_post_saves")
        .select("post_id")
        .in("post_id", normalizedPostIds)
        .eq("user_id", viewerUserId)
    : Promise.resolve({ data: [] as EngagementRow[], error: null });

  const [likesResult, commentsResult, viewerLikesResult, viewerSavesResult] = await Promise.all([
    likeQuery,
    commentQuery,
    viewerLikeQuery,
    viewerSaveQuery,
  ]);

  const firstError =
    likesResult.error ??
    commentsResult.error ??
    viewerLikesResult.error ??
    viewerSavesResult.error ??
    null;

  if (firstError) {
    return {
      summaries: new Map<string, FeedPostEngagementSummary>(),
      error: normalizeSupabaseError(firstError),
    };
  }

  const commentRows = (commentsResult.data ?? []) as CommentRow[];
  const commentAuthorIds = [...new Set(commentRows.map((row) => row.user_id))];
  const commentAuthorsByUserId = await loadCommentAuthors(commentAuthorIds);

  const summaries = buildEngagementSummaryMap({
    postIds: normalizedPostIds,
    likeRows: (likesResult.data ?? []) as EngagementRow[],
    saveRows: [],
    commentRows,
    viewerLikePostIds: new Set(
      ((viewerLikesResult.data ?? []) as EngagementRow[]).map((row) => row.post_id),
    ),
    viewerSavePostIds: new Set(
      ((viewerSavesResult.data ?? []) as EngagementRow[]).map((row) => row.post_id),
    ),
    commentAuthorsByUserId,
  });

  return { summaries, error: null };
}

export async function attachFeedPostEngagement(posts: FeedPost[], viewerUserId?: string | null) {
  const { summaries, error } = await fetchFeedPostEngagementSummaries(
    posts.map((post) => post.id),
    viewerUserId,
  );

  if (error) {
    return { data: posts, error };
  }

  return {
    data: posts.map((post) => mergeEngagementIntoFeedPost(post, summaries.get(post.id))),
    error: null,
  };
}

export async function fetchFeedPostComments(postId: string) {
  if (!supabase) {
    return { data: [] as FeedPostComment[], error: new Error("Supabase is not configured.") };
  }

  if (!isPersistedFeedPostId(postId)) {
    return { data: [] as FeedPostComment[], error: null };
  }

  const { data, error } = await supabase
    .from("feed_post_comments")
    .select("id, post_id, user_id, body, created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    return { data: [] as FeedPostComment[], error: normalizeSupabaseError(error) };
  }

  const rows = (data ?? []) as CommentRow[];
  const authorsByUserId = await loadCommentAuthors([...new Set(rows.map((row) => row.user_id))]);

  return {
    data: rows.map((row) => mapCommentRow(row, authorsByUserId[row.user_id])),
    error: null,
  };
}

export async function toggleFeedPostLike(postId: string, currentlyLiked: boolean) {
  if (!supabase) {
    return { liked: currentlyLiked, error: new Error("Supabase is not configured.") };
  }

  const { userId, error: sessionError } = await getCurrentAuthUserId();
  if (sessionError || !userId) {
    return {
      liked: currentlyLiked,
      error: sessionError ?? new Error("You must be signed in to like posts."),
    };
  }

  if (!isPersistedFeedPostId(postId)) {
    return { liked: currentlyLiked, error: new Error("This post cannot be liked.") };
  }

  if (currentlyLiked) {
    const { error } = await supabase
      .from("feed_post_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", userId);

    return { liked: false, error: error ? normalizeSupabaseError(error) : null };
  }

  const { error } = await supabase.from("feed_post_likes").insert({
    post_id: postId,
    user_id: userId,
  });

  if (error && isDuplicateEngagementError(error)) {
    return { liked: true, error: null };
  }

  return { liked: !error, error: error ? normalizeSupabaseError(error) : null };
}

export async function toggleFeedPostSave(postId: string, currentlySaved: boolean) {
  if (!supabase) {
    return { saved: currentlySaved, error: new Error("Supabase is not configured.") };
  }

  const { userId, error: sessionError } = await getCurrentAuthUserId();
  if (sessionError || !userId) {
    return {
      saved: currentlySaved,
      error: sessionError ?? new Error("You must be signed in to save posts."),
    };
  }

  if (!isPersistedFeedPostId(postId)) {
    return { saved: currentlySaved, error: new Error("This post cannot be saved.") };
  }

  if (currentlySaved) {
    const { error } = await supabase
      .from("feed_post_saves")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", userId);

    return { saved: false, error: error ? normalizeSupabaseError(error) : null };
  }

  const { error } = await supabase.from("feed_post_saves").insert({
    post_id: postId,
    user_id: userId,
  });

  if (error && isDuplicateEngagementError(error)) {
    return { saved: true, error: null };
  }

  return { saved: !error, error: error ? normalizeSupabaseError(error) : null };
}

export async function createFeedPostComment(postId: string, body: string) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const validation = validateFeedPostCommentBody(body);
  if (!validation.ok) {
    return { data: null, error: new Error(validation.message) };
  }

  const { userId, error: sessionError } = await getCurrentAuthUserId();
  if (sessionError || !userId) {
    return {
      data: null,
      error: sessionError ?? new Error("You must be signed in to comment."),
    };
  }

  if (!isPersistedFeedPostId(postId)) {
    return { data: null, error: new Error("This post cannot be commented on.") };
  }

  const { data, error } = await supabase
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
      error: error ? normalizeSupabaseError(error) : new Error("Comment could not be posted."),
    };
  }

  const authorsByUserId = await loadCommentAuthors([userId]);
  return {
    data: mapCommentRow(data as CommentRow, authorsByUserId[userId]),
    error: null,
  };
}

export async function deleteFeedPostComment(commentId: string) {
  if (!supabase) {
    return { error: new Error("Supabase is not configured.") };
  }

  const { userId, error: sessionError } = await getCurrentAuthUserId();
  if (sessionError || !userId) {
    return {
      error: sessionError ?? new Error("You must be signed in to delete comments."),
    };
  }

  const { data, error } = await supabase
    .from("feed_post_comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: normalizeSupabaseError(error) };
  }

  if (!data) {
    return { error: new Error("You can only delete your own comments.") };
  }

  return { error: null };
}
