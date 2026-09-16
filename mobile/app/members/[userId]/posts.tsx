import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { FeedPostCard } from "@/components/feed/FeedPostCard";
import { MemberHistoryListHeader } from "@/components/profile/MemberHistoryListHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { colors, layout, spacing, typography } from "@/constants/theme";
import { fetchMemberFeedPostsForUser } from "@/lib/api/feed";
import { formatMobileError } from "@/lib/errors";
import type { MobileFeedPost } from "@/types/feed";

const PAGE_SIZE = 10;

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0]?.trim() ?? "";
  return value?.trim() ?? "";
}

export default function MemberPostsScreen() {
  const params = useLocalSearchParams<{ userId: string; memberName?: string }>();
  const userId = firstParam(params.userId);
  const memberName = firstParam(params.memberName) || "Member";

  const [posts, setPosts] = useState<MobileFeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(
    async (offset: number, append: boolean) => {
      if (!userId) return;
      if (append) setLoadingMore(true);
      else setLoading(true);

      const { data, error: fetchError, hasMore: more } = await fetchMemberFeedPostsForUser(userId, {
        limit: PAGE_SIZE,
        offset,
      });

      if (fetchError) {
        setError(formatMobileError(fetchError.message));
        if (!append) setPosts([]);
      } else {
        setError(null);
        setPosts((prev) => (append ? [...prev, ...data] : data));
        setHasMore(more);
      }

      setLoading(false);
      setLoadingMore(false);
    },
    [userId],
  );

  useEffect(() => {
    void loadPage(0, false);
  }, [loadPage]);

  if (!userId) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <MemberHistoryListHeader title="Posts" />
        <Text style={styles.errorText}>Member unavailable.</Text>
      </SafeAreaView>
    );
  }

  if (loading && posts.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <MemberHistoryListHeader title="Posts" subtitle={`Activity from ${memberName}.`} />
        <LoadingState label="Loading posts…" fullScreen />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <MemberHistoryListHeader title="Posts" subtitle={`Activity from ${memberName}.`} />
        }
        ListEmptyComponent={
          error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <Text style={styles.empty}>No posts yet.</Text>
          )
        }
        renderItem={({ item }) => <FeedPostCard post={item} />}
        onEndReached={() => {
          if (!hasMore || loadingMore || loading) return;
          void loadPage(posts.length, true);
        }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator color={colors.forest} />
              <Text style={styles.footerLabel}>Loading more…</Text>
            </View>
          ) : hasMore ? (
            <Pressable onPress={() => void loadPage(posts.length, true)} style={styles.loadMore}>
              <Text style={styles.loadMoreLabel}>Load more</Text>
            </Pressable>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  list: {
    paddingHorizontal: layout.pagePadding,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  empty: {
    fontFamily: typography.sans,
    fontSize: typography.body,
    color: colors.textSecondary,
  },
  errorText: {
    fontFamily: typography.sans,
    fontSize: typography.body,
    color: colors.error,
    paddingHorizontal: layout.pagePadding,
  },
  footer: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  footerLabel: {
    fontFamily: typography.sans,
    fontSize: typography.bodySm,
    color: colors.textTertiary,
  },
  loadMore: {
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
  loadMoreLabel: {
    fontFamily: typography.sansMedium,
    fontSize: typography.bodySm,
    color: colors.forest,
  },
});
