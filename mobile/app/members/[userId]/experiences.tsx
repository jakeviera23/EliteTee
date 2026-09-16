import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { RoundReviewCard } from "@/components/courses/RoundReviewCard";
import { MemberHistoryListHeader } from "@/components/profile/MemberHistoryListHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { colors, layout, spacing, typography } from "@/constants/theme";
import { fetchMemberCourseRoundsForUser } from "@/lib/api/memberProfile";
import { formatMobileError } from "@/lib/errors";
import type { MobileCourseRoundRecord } from "@/types/courseRoundPhoto";

const PAGE_SIZE = 12;

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0]?.trim() ?? "";
  return value?.trim() ?? "";
}

export default function MemberExperiencesScreen() {
  const params = useLocalSearchParams<{ userId: string; memberName?: string }>();
  const userId = firstParam(params.userId);
  const memberName = firstParam(params.memberName) || "Member";

  const [rounds, setRounds] = useState<MobileCourseRoundRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(
    async (offset: number, append: boolean) => {
      if (!userId) return;
      if (append) setLoadingMore(true);
      else setLoading(true);

      const { data, error: fetchError, hasMore: more } = await fetchMemberCourseRoundsForUser(
        userId,
        { limit: PAGE_SIZE, offset, hydrate: true },
      );

      if (fetchError) {
        setError(formatMobileError(fetchError.message));
        if (!append) setRounds([]);
      } else {
        setError(null);
        setRounds((prev) => (append ? [...prev, ...data] : data));
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
        <MemberHistoryListHeader title="Experiences" />
        <Text style={styles.errorText}>Member unavailable.</Text>
      </SafeAreaView>
    );
  }

  if (loading && rounds.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <MemberHistoryListHeader
          title="Experiences"
          subtitle={`Rounds shared by ${memberName}.`}
        />
        <LoadingState label="Loading experiences…" fullScreen />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <FlatList
        data={rounds}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <MemberHistoryListHeader
            title="Experiences"
            subtitle={`Rounds shared by ${memberName}.`}
          />
        }
        ListEmptyComponent={
          error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <Text style={styles.empty}>No experiences shared yet.</Text>
          )
        }
        renderItem={({ item }) => (
          <RoundReviewCard
            variant="compact"
            round={{
              ...item,
              member_name: memberName,
              member_user_id: item.member_user_id || userId,
            }}
          />
        )}
        onEndReached={() => {
          if (!hasMore || loadingMore || loading) return;
          void loadPage(rounds.length, true);
        }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator color={colors.forest} />
              <Text style={styles.footerLabel}>Loading more…</Text>
            </View>
          ) : hasMore ? (
            <Pressable
              onPress={() => void loadPage(rounds.length, true)}
              style={styles.loadMore}
            >
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
    paddingHorizontal: layout.pagePadding,
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
