import type { MobileFeedPost } from "@/types/feed";
import { stripFeedPostSignedMedia } from "./feedSignedMedia";
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
  if (Array.isArray(cached)) return stripFeedPostSignedMedia(cached);
  return stripFeedPostSignedMedia(cached.posts ?? []);
}

/** Persist a post snapshot for instant post-detail rendering (canonical refs only). */
export function cacheFeedPostSnapshot(post: MobileFeedPost) {
  if (!post.id.trim()) return;
  const [cacheSafe] = stripFeedPostSignedMedia([post]);
  setSessionCache(SESSION_CACHE_KEYS.feedPost(post.id), cacheSafe);
}

/** Prefer explicit post cache, then home feed cache. Signed media is stripped. */
export function findCachedFeedPost(postId: string): MobileFeedPost | null {
  const normalized = postId.trim();
  if (!normalized) return null;

  const direct = getSessionCacheStale<MobileFeedPost>(SESSION_CACHE_KEYS.feedPost(normalized));
  if (direct?.id === normalized) {
    return stripFeedPostSignedMedia([direct])[0] ?? null;
  }

  return postsFromHomeCache().find((post) => post.id === normalized) ?? null;
}
