import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { FeedPostCard } from "@/components/feed/FeedPostCard";
import { BrandedHeader } from "@/components/ui/BrandedHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { MemberAvatar } from "@/components/ui/MemberAvatar";
import { colors, layout, radii, spacing, typography } from "@/constants/theme";
import { fetchFeedPage, resolveFeedPostsMedia, stripFeedPostSignedMedia } from "@/lib/api/feed";
import { formatMobileError } from "@/lib/errors";
import { perfEnd, perfStart } from "@/lib/perfTiming";
import {
  SESSION_CACHE_KEYS,
  getSessionCacheStale,
  setSessionCache,
} from "@/lib/sessionCache";
import { useAuth } from "@/hooks/AuthProvider";
import { cacheFeedPostSnapshot } from "@/lib/feedPostCache";
import { formatMemberContextLine, formatPrimaryClubLine } from "@/lib/display";
import { getMemberDisplayName } from "@/lib/memberInitials";
import type { MobileFeedPost } from "@/types/feed";

type FeedCursor = { createdAt: string; id: string };

type HomeFeedCache = {
  posts: MobileFeedPost[];
  hasMore: boolean;
  nextCursor: FeedCursor | null;
};

const PAGE_SIZE = 20;

function readHomeFeedCache(): HomeFeedCache | null {
  const cached = getSessionCacheStale<HomeFeedCache | MobileFeedPost[]>(SESSION_CACHE_KEYS.homeFeed);
  if (!cached) return null;
  if (Array.isArray(cached)) {
    return { posts: stripFeedPostSignedMedia(cached), hasMore: true, nextCursor: null };
  }
  return {
    ...cached,
    posts: stripFeedPostSignedMedia(cached.posts ?? []),
  };
}

function mergeUniquePosts(existing: MobileFeedPost[], incoming: MobileFeedPost[]) {
  const seen = new Set(existing.map((post) => post.id));
  const next = [...existing];
  for (const post of incoming) {
    if (seen.has(post.id)) continue;
    seen.add(post.id);
    next.push(post);
  }
  return next;
}

export default function HomeScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const initialCache = useMemo(() => readHomeFeedCache(), []);
  const [posts, setPosts] = useState<MobileFeedPost[]>(() => initialCache?.posts ?? []);
  const [hasMore, setHasMore] = useState(() => initialCache?.hasMore ?? true);
  const [nextCursor, setNextCursor] = useState<FeedCursor | null>(
    () => initialCache?.nextCursor ?? null,
  );
  const [loading, setLoading] = useState(() => (initialCache?.posts.length ?? 0) === 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const requestId = useRef(0);
  const loadingMoreLock = useRef(false);

  const persistCache = useCallback(
    (nextPosts: MobileFeedPost[], nextHasMore: boolean, cursor: FeedCursor | null) => {
      const cacheSafe = stripFeedPostSignedMedia(nextPosts);
      for (const post of cacheSafe) {
        cacheFeedPostSnapshot(post);
      }
      setSessionCache(SESSION_CACHE_KEYS.homeFeed, {
        posts: cacheSafe,
        hasMore: nextHasMore,
        nextCursor: cursor,
      } satisfies HomeFeedCache);
    },
    [],
  );

  // Re-sign media for session-cached posts on mount (never persist signed URLs).
  useEffect(() => {
    const cached = readHomeFeedCache();
    if (!cached?.posts.length) return;
    let active = true;
    void resolveFeedPostsMedia(cached.posts).then((resolved) => {
      if (!active) return;
      setPosts(resolved);
    });
    return () => {
      active = false;
    };
  }, []);

  const loadFeed = useCallback(
    async (options?: { background?: boolean; refresh?: boolean }) => {
      const cached = readHomeFeedCache();
      const hasCache = Boolean(cached?.posts.length);
      const currentRequest = ++requestId.current;

      if (options?.refresh) {
        setRefreshing(true);
      } else if (hasCache) {
        setPosts(cached!.posts);
        setHasMore(cached!.hasMore);
        setNextCursor(cached!.nextCursor);
        setLoading(false);
        void resolveFeedPostsMedia(cached!.posts).then((resolved) => {
          if (currentRequest !== requestId.current) return;
          setPosts(resolved);
        });
      } else if (!options?.background) {
        setLoading(true);
      }

      setError(null);
      setPageError(null);
      perfStart("home");

      const { data, error: feedError } = await fetchFeedPage({ limit: PAGE_SIZE });

      if (currentRequest !== requestId.current) {
        return;
      }

      perfEnd("home", { posts: data.posts.length, cached: hasCache });

      if (feedError) {
        // Soft-fail: keep stale posts and cache; never replace with [].
        setError(formatMobileError(feedError.message));
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setPosts(data.posts);
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
      persistCache(data.posts, data.hasMore, data.nextCursor);
      setError(null);
      setLoading(false);
      setRefreshing(false);
    },
    [persistCache],
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || !nextCursor || loadingMoreLock.current || loading || refreshing) {
      return;
    }

    loadingMoreLock.current = true;
    setLoadingMore(true);
    setPageError(null);

    const { data, error: feedError } = await fetchFeedPage({
      limit: PAGE_SIZE,
      cursor: nextCursor,
    });

    if (feedError) {
      setPageError(formatMobileError(feedError.message));
      setLoadingMore(false);
      loadingMoreLock.current = false;
      return;
    }

    setPosts((current) => {
      const merged = mergeUniquePosts(current, data.posts);
      persistCache(merged, data.hasMore, data.nextCursor);
      return merged;
    });
    setHasMore(data.hasMore);
    setNextCursor(data.nextCursor);
    setLoadingMore(false);
    loadingMoreLock.current = false;
  }, [hasMore, nextCursor, loading, refreshing, persistCache]);

  useFocusEffect(
    useCallback(() => {
      const cached = readHomeFeedCache();
      void loadFeed({ background: Boolean(cached?.posts.length) });
    }, [loadFeed]),
  );

  const greetingName = getMemberDisplayName(profile?.full_name);
  const identityMeta =
    formatMemberContextLine([
      formatPrimaryClubLine(profile?.primary_club),
      profile?.based_in,
    ]) || "Complete your profile to help members find you.";

  const showInitialLoading = loading && posts.length === 0;

  const listHeader = (
    <>
      <BrandedHeader
        title="Home"
        subtitle="From the network"
        right={
          <Pressable onPress={() => router.push("/notifications")} style={styles.iconButton}>
            <Text style={styles.iconButtonLabel}>Alerts</Text>
          </Pressable>
        }
      />

      <View style={styles.identityCard}>
        <View style={styles.identityRow}>
          <MemberAvatar
            name={greetingName || "You"}
            imageUrl={profile?.club_logo_url}
            size={48}
          />
          <View style={styles.identityCopy}>
            <Text style={styles.identityEyebrow}>Signed in as</Text>
            {greetingName ? <Text style={styles.identityName}>{greetingName}</Text> : null}
            <Text style={styles.identityMeta}>{identityMeta}</Text>
          </View>
        </View>
      </View>

      {showInitialLoading ? <LoadingState label="Loading member activity…" /> : null}

      {!showInitialLoading && error && posts.length === 0 ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => void loadFeed()}>
            <Text style={styles.retry}>Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {!showInitialLoading && error && posts.length > 0 ? (
        <View style={styles.softErrorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => void loadFeed({ refresh: true })}>
            <Text style={styles.retry}>Refresh</Text>
          </Pressable>
        </View>
      ) : null}

      {!showInitialLoading && !error && posts.length === 0 ? (
        <EmptyState
          title="No member posts yet"
          body="Share a round, travel plan, or introduction request to begin the conversation."
        />
      ) : null}
    </>
  );

  const listFooter =
    posts.length > 0 ? (
      <View style={styles.footer}>
        {loadingMore ? (
          <View style={styles.footerLoading}>
            <ActivityIndicator color={colors.forest} />
            <Text style={styles.footerText}>Loading more…</Text>
          </View>
        ) : null}

        {pageError ? (
          <View style={styles.pageErrorCard}>
            <Text style={styles.errorText}>{pageError}</Text>
            <Pressable onPress={() => void loadMore()}>
              <Text style={styles.retry}>Try again</Text>
            </Pressable>
          </View>
        ) : null}

        {!hasMore && !loadingMore && !pageError ? (
          <Text style={styles.endText}>You are caught up with the network.</Text>
        ) : null}
      </View>
    ) : null;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FeedPostCard
            post={item}
            onPostChange={(updated) =>
              setPosts((current) => {
                const next = current.map((entry) => (entry.id === updated.id ? updated : entry));
                persistCache(next, hasMore, nextCursor);
                return next;
              })
            }
          />
        )}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onEndReached={() => void loadMore()}
        onEndReachedThreshold={0.4}
        refreshing={refreshing}
        onRefresh={() => void loadFeed({ refresh: true })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  content: {
    paddingHorizontal: layout.pagePadding,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },
  identityCard: {
    padding: spacing.xl,
    borderRadius: radii.lg,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    shadowColor: colors.shadowSm,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 1,
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  identityCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  identityEyebrow: {
    fontFamily: typography.sansMedium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.gold,
  },
  identityName: {
    fontFamily: typography.serif,
    fontSize: 24,
    color: colors.textPrimary,
  },
  identityMeta: {
    fontFamily: typography.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  iconButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  iconButtonLabel: {
    fontFamily: typography.sansMedium,
    fontSize: 12,
    color: colors.gold,
    letterSpacing: 0.4,
  },
  errorCard: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.errorSoft,
    gap: spacing.sm,
  },
  softErrorCard: {
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.errorSoft,
    gap: spacing.xs,
  },
  pageErrorCard: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.errorSoft,
    gap: spacing.sm,
  },
  errorText: {
    fontFamily: typography.sans,
    fontSize: 14,
    color: colors.error,
  },
  retry: {
    fontFamily: typography.sansMedium,
    fontSize: 14,
    color: colors.gold,
  },
  footer: {
    gap: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  footerLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  footerText: {
    fontFamily: typography.sans,
    fontSize: 13,
    color: colors.textTertiary,
  },
  endText: {
    fontFamily: typography.sans,
    fontSize: 13,
    color: colors.textTertiary,
    textAlign: "center",
  },
});
