type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry<unknown>>();

const DEFAULT_TTL_MS = 5 * 60 * 1000;

export function getSessionCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value as T;
}

/** Returns cached value even if expired — for stale-while-revalidate UI. */
export function getSessionCacheStale<T>(key: string): T | null {
  const entry = cache.get(key);
  return entry ? (entry.value as T) : null;
}

export function setSessionCache<T>(key: string, value: T, ttlMs = DEFAULT_TTL_MS) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function invalidateSessionCache(key: string) {
  cache.delete(key);
}

export function invalidateSessionCachePrefix(prefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

export function clearSessionCaches() {
  cache.clear();
}

export const SESSION_CACHE_KEYS = {
  homeFeed: "feed:home",
  discoverMembers: "discover:members",
  discoverCourses: (query: string, offset: number) =>
    `discover:courses:${query.trim().toLowerCase()}:${offset}`,
  conversations: "messages:conversations",
  profileIdentity: (userId: string) => `profile:${userId}:identity`,
  profileSecondary: (userId: string) => `profile:${userId}:secondary`,
  profileFeedPosts: (userId: string) => `profile:${userId}:feed-posts`,
} as const;
