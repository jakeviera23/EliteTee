import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MemberHistoryListHeader } from "@/components/profile/MemberHistoryListHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { colors, layout, spacing, typography } from "@/constants/theme";
import { fetchMemberCourseRoundsForUser } from "@/lib/api/memberProfile";
import { formatMobileError } from "@/lib/errors";
import {
  buildUniqueCoursesPlayed,
  formatProfileCoursePlayedMeta,
  type ProfileCoursePlayedSummary,
} from "@/lib/profilePageDisplay";
import type { MobileCourseRoundRecord } from "@/types/courseRoundPhoto";

const PAGE_SIZE = 40;

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0]?.trim() ?? "";
  return value?.trim() ?? "";
}

export default function MemberCoursesPlayedScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId: string; memberName?: string }>();
  const userId = firstParam(params.userId);
  const memberName = firstParam(params.memberName) || "Member";

  const [allRounds, setAllRounds] = useState<MobileCourseRoundRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreRounds, setHasMoreRounds] = useState(false);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const courses = useMemo(() => buildUniqueCoursesPlayed(allRounds), [allRounds]);

  const loadRounds = useCallback(
    async (nextOffset: number, append: boolean) => {
      if (!userId) return;
      if (append) setLoadingMore(true);
      else setLoading(true);

      const { data, error: fetchError, hasMore } = await fetchMemberCourseRoundsForUser(userId, {
        limit: PAGE_SIZE,
        offset: nextOffset,
        hydrate: false,
      });

      if (fetchError) {
        setError(formatMobileError(fetchError.message));
        if (!append) setAllRounds([]);
      } else {
        setError(null);
        setAllRounds((prev) => (append ? [...prev, ...data] : data));
        setOffset(nextOffset + data.length);
        setHasMoreRounds(hasMore);
      }

      setLoading(false);
      setLoadingMore(false);
    },
    [userId],
  );

  useEffect(() => {
    void loadRounds(0, false);
  }, [loadRounds]);

  const subtitle = useMemo(() => {
    const count = courses.length;
    if (count === 0) return `Courses ${memberName} has played.`;
    return `${count} course${count === 1 ? "" : "s"} · ${memberName}`;
  }, [courses.length, memberName]);

  if (!userId) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <MemberHistoryListHeader title="Courses played" />
        <Text style={styles.errorText}>Member unavailable.</Text>
      </SafeAreaView>
    );
  }

  if (loading && courses.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <MemberHistoryListHeader title="Courses played" subtitle={subtitle} />
        <LoadingState label="Loading courses…" fullScreen />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <FlatList
        data={courses}
        keyExtractor={(item: ProfileCoursePlayedSummary) => item.key}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <MemberHistoryListHeader title="Courses played" subtitle={subtitle} />
        }
        ListEmptyComponent={
          error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <Text style={styles.empty}>No courses recorded yet.</Text>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              item.courseSlug ? router.push(`/courses/${item.courseSlug}`) : undefined
            }
            disabled={!item.courseSlug}
            style={styles.courseRow}
          >
            <Text style={styles.courseName}>{item.courseName}</Text>
            <Text style={styles.courseMeta}>{formatProfileCoursePlayedMeta(item)}</Text>
          </Pressable>
        )}
        onEndReached={() => {
          if (!hasMoreRounds || loadingMore || loading) return;
          void loadRounds(offset, true);
        }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator color={colors.forest} />
              <Text style={styles.footerLabel}>Loading more…</Text>
            </View>
          ) : hasMoreRounds ? (
            <Pressable onPress={() => void loadRounds(offset, true)} style={styles.loadMore}>
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
  courseRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderHairline,
    gap: 2,
  },
  courseName: {
    fontFamily: typography.sansSemibold,
    fontSize: typography.body,
    color: colors.textPrimary,
  },
  courseMeta: {
    fontFamily: typography.sans,
    fontSize: typography.bodySm,
    color: colors.textTertiary,
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
