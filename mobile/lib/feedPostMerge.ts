import type { MobileFeedPost } from "@/types/feed";

/** Engagement fields that optimistic UI updates; must not be clobbered by stale fetches. */
const ENGAGEMENT_KEYS = ["isLiked", "likeCount", "isSaved", "commentCount"] as const;

function looksLikeOptimisticLikeDivergence(local: MobileFeedPost, incoming: MobileFeedPost) {
  if (local.isLiked === incoming.isLiked) return false;
  const delta = local.likeCount - incoming.likeCount;
  if (local.isLiked && delta === 1) return true;
  if (!local.isLiked && delta === -1) return true;
  return false;
}

function looksLikeOptimisticSaveDivergence(local: MobileFeedPost, incoming: MobileFeedPost) {
  return local.isSaved !== incoming.isSaved;
}

/**
 * Apply a partial engagement/content patch onto the matching post in-list.
 * Used so like/save handlers never merge onto a stale closed-over post snapshot.
 */
export function applyFeedPostPatch(
  posts: MobileFeedPost[],
  postId: string,
  patch: Partial<MobileFeedPost>,
): MobileFeedPost[] {
  return posts.map((post) => (post.id === postId ? { ...post, ...patch } : post));
}

/**
 * When re-signing media for cached posts, keep the latest local engagement so an
 * in-flight like/save is not overwritten when the async resolve completes.
 */
export function mergeResolvedFeedMediaPreservingEngagement(
  current: MobileFeedPost[],
  resolved: MobileFeedPost[],
): MobileFeedPost[] {
  const currentById = new Map(current.map((post) => [post.id, post]));
  return resolved.map((post) => {
    const local = currentById.get(post.id);
    if (!local) return post;
    return {
      ...post,
      isLiked: local.isLiked,
      likeCount: local.likeCount,
      isSaved: local.isSaved,
      commentCount: local.commentCount,
    };
  });
}

/**
 * Replace the feed page with a network result while preserving local optimistic
 * like/save state that has not yet been reflected by the server response.
 */
export function mergeIncomingFeedPostsPreservingOptimisticEngagement(
  current: MobileFeedPost[],
  incoming: MobileFeedPost[],
): MobileFeedPost[] {
  const currentById = new Map(current.map((post) => [post.id, post]));
  return incoming.map((post) => {
    const local = currentById.get(post.id);
    if (!local) return post;

    let next = post;
    if (looksLikeOptimisticLikeDivergence(local, post)) {
      next = {
        ...next,
        isLiked: local.isLiked,
        likeCount: local.likeCount,
      };
    }
    if (looksLikeOptimisticSaveDivergence(local, next)) {
      next = { ...next, isSaved: local.isSaved };
    }

    // Keep a locally higher comment count if the user just posted a comment.
    if (local.commentCount > next.commentCount) {
      next = { ...next, commentCount: local.commentCount };
    }

    return next;
  });
}

export function engagementSnapshot(post: MobileFeedPost) {
  return {
    isLiked: post.isLiked,
    likeCount: post.likeCount,
    isSaved: post.isSaved,
    commentCount: post.commentCount,
  } satisfies Pick<MobileFeedPost, (typeof ENGAGEMENT_KEYS)[number]>;
}
