import { useCallback, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { FeedPostCard } from "@/components/feed/FeedPostCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { MemberAvatar } from "@/components/ui/MemberAvatar";
import { Screen } from "@/components/ui/Screen";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { fetchFeedPage } from "@/lib/api/feed";
import { formatMobileError } from "@/lib/errors";
import { perfEnd, perfStart } from "@/lib/perfTiming";
import {
  SESSION_CACHE_KEYS,
  getSessionCacheStale,
  setSessionCache,
} from "@/lib/sessionCache";
import { useAuth } from "@/hooks/AuthProvider";
import { formatMemberContextLine, formatPrimaryClubLine } from "@/lib/display";
import { getMemberDisplayName } from "@/lib/memberInitials";
import type { MobileFeedPost } from "@/types/feed";

export default function HomeScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [posts, setPosts] = useState<MobileFeedPost[]>(
    () => getSessionCacheStale<MobileFeedPost[]>(SESSION_CACHE_KEYS.homeFeed) ?? [],
  );
  const [loading, setLoading] = useState(() => posts.length === 0);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const loadFeed = useCallback(async (options?: { background?: boolean }) => {
    const cached = getSessionCacheStale<MobileFeedPost[]>(SESSION_CACHE_KEYS.homeFeed);
    const hasCache = Boolean(cached?.length);
    const currentRequest = ++requestId.current;

    if (hasCache) {
      setPosts(cached!);
      setLoading(false);
    } else if (!options?.background) {
      setLoading(true);
    }

    setError(null);
    perfStart("home");

    const { data, error: feedError } = await fetchFeedPage({ limit: 20 });

    if (currentRequest !== requestId.current) {
      return;
    }

    perfEnd("home", { posts: data.posts.length, cached: hasCache });

    setPosts(data.posts);
    if (data.posts.length > 0) {
      setSessionCache(SESSION_CACHE_KEYS.homeFeed, data.posts);
    }
    setError(feedError ? formatMobileError(feedError.message) : null);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      const cached = getSessionCacheStale<MobileFeedPost[]>(SESSION_CACHE_KEYS.homeFeed);
      void loadFeed({ background: Boolean(cached?.length) });
    }, [loadFeed]),
  );

  const greetingName = getMemberDisplayName(profile?.full_name);
  const identityMeta =
    formatMemberContextLine([
      formatPrimaryClubLine(profile?.primary_club),
      profile?.based_in,
    ]) || "Complete your profile to help members find you.";

  const showInitialLoading = loading && posts.length === 0;

  return (
    <Screen
      title="Home"
      subtitle="From the network"
      branded
      headerRight={
        <Pressable onPress={() => router.push("/notifications")} style={styles.iconButton}>
          <Text style={styles.iconButtonLabel}>Alerts</Text>
        </Pressable>
      }
    >
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

      {!showInitialLoading && !error && posts.length === 0 ? (
        <EmptyState
          title="No member posts yet"
          body="Share a round, travel plan, or introduction request to begin the conversation."
        />
      ) : null}

      {posts.length > 0
        ? posts.map((post) => (
            <FeedPostCard
              key={post.id}
              post={post}
              onPostChange={(updated) =>
                setPosts((current) => {
                  const next = current.map((entry) => (entry.id === updated.id ? updated : entry));
                  setSessionCache(SESSION_CACHE_KEYS.homeFeed, next);
                  return next;
                })
              }
            />
          ))
        : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
});
