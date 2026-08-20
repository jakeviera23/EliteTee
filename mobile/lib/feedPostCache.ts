import type { MobileFeedPost } from "@/types/feed";
import {
  SESSION_CACHE_KEYS,
  getSessionCacheStale,
  setSessionCache,
} from "./sessionCache";

type HomeFeedCache = {
  posts: MobileFeedPost[];
  hasMore: boolean;
  nextCursor: { createdAt: string; id: string } | null;
};

function postsFromHomeCache(): MobileFeedPost[] {
  const cached = getSessionCacheStale<HomeFeedCache | MobileFeedPost[]>(SESSION_CACHE_KEYS.homeFeed);
  if (!cached) return [];
  if (Array.isArray(cached)) return cached;
  return cached.posts ?? [];
}

/** Persist a post snapshot for instant post-detail rendering. */
export function cacheFeedPostSnapshot(post: MobileFeedPost) {
  if (!post.id.trim()) return;
  setSessionCache(SESSION_CACHE_KEYS.feedPost(post.id), post);
}

/** Prefer explicit post cache, then home feed cache. */
export function findCachedFeedPost(postId: string): MobileFeedPost | null {
  const normalized = postId.trim();
  if (!normalized) return null;

  const direct = getSessionCacheStale<MobileFeedPost>(SESSION_CACHE_KEYS.feedPost(normalized));
  if (direct?.id === normalized) return direct;

  return postsFromHomeCache().find((post) => post.id === normalized) ?? null;
}
