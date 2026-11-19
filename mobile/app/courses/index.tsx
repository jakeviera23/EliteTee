import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { CourseCard } from "@/components/courses/CourseCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Screen } from "@/components/ui/Screen";
import { colors, radii, spacing, typography } from "@/constants/theme";
import {
  fetchGolfCourseDirectoryPage,
  SEARCH_PAGE_SIZE,
} from "@/lib/api/courses";
import { appendUniqueCourses } from "@/lib/courseResultsAppend";
import { formatMobileError } from "@/lib/errors";
import type { MobileGolfCourse } from "@/types/course";

export default function CoursesScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [courses, setCourses] = useState<MobileGolfCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const loadCoursesPage = useCallback(async (searchQuery: string, offset: number, append: boolean) => {
    const currentRequest = ++requestId.current;

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setError(null);
    }

    const { data, error: fetchError } = await fetchGolfCourseDirectoryPage({
      query: searchQuery,
      limit: SEARCH_PAGE_SIZE,
      offset,
    });

    if (currentRequest !== requestId.current) {
      return;
    }

    if (fetchError) {
      if (!append) {
        setCourses([]);
        setError(formatMobileError(fetchError.message));
      }
      setHasMore(false);
    } else {
      setCourses((current) => (append ? appendUniqueCourses(current, data) : data));
      setHasMore(data.length === SEARCH_PAGE_SIZE);
      if (!append) {
        setError(null);
      }
    }

    setLoading(false);
    setLoadingMore(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadCoursesPage(query, 0, false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, loadCoursesPage]);

  function handleLoadMore() {
    if (loading || loadingMore || !hasMore) return;
    void loadCoursesPage(query, courses.length, true);
  }

  return (
    <Screen
      title="Courses"
      subtitle="Search the EliteTee course directory."
      scroll={false}
      contentStyle={styles.screen}
    >
      <Button label="Back" variant="ghost" onPress={() => router.back()} />

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search courses by name or location"
        placeholderTextColor={colors.textTertiary}
        style={styles.search}
        autoCorrect={false}
      />

      {loading ? <LoadingState label="Loading courses…" /> : null}

      {!loading && error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {!loading && !error ? (
        <FlatList
          data={courses}
          keyExtractor={(course) => course.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.35}
          ListEmptyComponent={
            <EmptyState
              title="No courses found"
              body="Try a different search term to browse the full course directory."
            />
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator color={colors.forest} size="small" />
                <Text style={styles.footerLabel}>Loading more courses…</Text>
              </View>
            ) : hasMore && courses.length > 0 ? (
              <Pressable onPress={handleLoadMore} style={styles.loadMore}>
                <Text style={styles.loadMoreLabel}>Load more courses</Text>
              </Pressable>
            ) : null
          }
          renderItem={({ item: course }) => (
            <CourseCard
              course={course}
              onPress={() => router.push(`/courses/${course.slug}`)}
            />
          )}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    gap: spacing.lg,
    paddingBottom: spacing.lg,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  search: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontFamily: typography.sans,
    fontSize: 15,
    color: colors.textPrimary,
  },
  errorBox: {
    padding: spacing.lg,
    backgroundColor: colors.errorSoft,
    borderRadius: radii.lg,
  },
  errorText: {
    fontFamily: typography.sans,
    fontSize: 14,
    color: colors.error,
  },
  footerLoader: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  footerLabel: {
    fontFamily: typography.sans,
    fontSize: 13,
    color: colors.textSecondary,
  },
  loadMore: {
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
  loadMoreLabel: {
    fontFamily: typography.sansMedium,
    fontSize: 14,
    color: colors.forest,
  },
});
