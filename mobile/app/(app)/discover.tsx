import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { MemberCard } from "@/components/discover/MemberCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Screen } from "@/components/ui/Screen";
import { colors, radii, spacing, typography } from "@/constants/theme";
import {
  fetchGolfCourseDirectoryPage,
  SEARCH_PAGE_SIZE,
} from "@/lib/api/courses";
import { appendUniqueCourses } from "@/lib/courseResultsAppend";
import { fetchDiscoverableMembers } from "@/lib/api/members";
import { formatMobileError } from "@/lib/errors";
import { perfEnd, perfStart } from "@/lib/perfTiming";
import {
  SESSION_CACHE_KEYS,
  getSessionCacheStale,
  setSessionCache,
} from "@/lib/sessionCache";
import { useAuth } from "@/hooks/AuthProvider";
import type { MobileGolfCourse } from "@/types/course";
import type { MobileMemberProfile } from "@/types/member";

type DiscoverTab = "members" | "courses";

export default function DiscoverScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<DiscoverTab>("members");
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState<MobileMemberProfile[]>(
    () => getSessionCacheStale<MobileMemberProfile[]>(SESSION_CACHE_KEYS.discoverMembers) ?? [],
  );
  const [courses, setCourses] = useState<MobileGolfCourse[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(() => members.length === 0);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingMoreCourses, setLoadingMoreCourses] = useState(false);
  const [hasMoreCourses, setHasMoreCourses] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const courseRequestId = useRef(0);

  const loadMembers = useCallback(async (options?: { background?: boolean }) => {
    const cached = getSessionCacheStale<MobileMemberProfile[]>(SESSION_CACHE_KEYS.discoverMembers);
    const hasCache = Boolean(cached?.length);

    if (hasCache) {
      setMembers(cached!);
      setLoadingMembers(false);
    } else if (!options?.background) {
      setLoadingMembers(true);
    }

    setError(null);
    perfStart("discover-members");

    const { data, error: fetchError } = await fetchDiscoverableMembers();

    perfEnd("discover-members", { members: data.length, cached: hasCache });

    setMembers(data);
    if (data.length > 0) {
      setSessionCache(SESSION_CACHE_KEYS.discoverMembers, data);
    }
    setError(fetchError ? formatMobileError(fetchError.message) : null);
    setLoadingMembers(false);
  }, []);

  const loadCoursesPage = useCallback(async (searchQuery: string, offset: number, append: boolean) => {
    const requestId = ++courseRequestId.current;
    const cacheKey = SESSION_CACHE_KEYS.discoverCourses(searchQuery, offset);
    const cached = !append ? getSessionCacheStale<MobileGolfCourse[]>(cacheKey) : null;
    const hasCache = Boolean(cached?.length);

    if (append) {
      setLoadingMoreCourses(true);
    } else if (hasCache) {
      setCourses(cached!);
      setLoadingCourses(false);
    } else {
      setLoadingCourses(true);
      setError(null);
    }

    if (!append && !hasCache) {
      setError(null);
    }

    perfStart("discover-courses");

    const { data, error: fetchError } = await fetchGolfCourseDirectoryPage({
      query: searchQuery,
      limit: SEARCH_PAGE_SIZE,
      offset,
    });

    if (requestId !== courseRequestId.current) {
      return;
    }

    perfEnd("discover-courses", {
      courses: data.length,
      offset,
      query: searchQuery.trim(),
      cached: hasCache,
      append,
    });

    if (fetchError) {
      if (!append && !hasCache) {
        setCourses([]);
        setError(formatMobileError(fetchError.message));
      }
      setHasMoreCourses(false);
    } else {
      setCourses((current) => (append ? appendUniqueCourses(current, data) : data));
      setHasMoreCourses(data.length === SEARCH_PAGE_SIZE);
      if (!append && data.length > 0) {
        setSessionCache(cacheKey, data);
      }
      if (!append) {
        setError(null);
      }
    }

    setLoadingCourses(false);
    setLoadingMoreCourses(false);
  }, []);

  useEffect(() => {
    const cached = getSessionCacheStale<MobileMemberProfile[]>(SESSION_CACHE_KEYS.discoverMembers);
    void loadMembers({ background: Boolean(cached?.length) });
  }, [loadMembers]);

  useEffect(() => {
    if (activeTab !== "courses") return;

    const timer = setTimeout(() => {
      void loadCoursesPage(query, 0, false);
    }, 300);

    return () => clearTimeout(timer);
  }, [activeTab, query, loadCoursesPage]);

  const visibleMembers = useMemo(() => {
    const others = members.filter((member) => member.user_id && member.user_id !== user?.id);
    const trimmed = query.trim().toLowerCase();
    if (!trimmed || activeTab !== "members") return others;

    return others.filter((member) => {
      const haystack = [
        member.full_name,
        member.primary_club,
        member.based_in,
        member.industry,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(trimmed);
    });
  }, [activeTab, members, query, user?.id]);

  const searchPlaceholder =
    activeTab === "members"
      ? "Search members by name, club, or location"
      : "Search courses by name or location";

  const controls = (
    <>
      <View style={styles.segmented}>
        <Pressable
          onPress={() => setActiveTab("members")}
          style={[styles.segment, activeTab === "members" ? styles.segmentActive : null]}
        >
          <Text style={[styles.segmentLabel, activeTab === "members" ? styles.segmentLabelActive : null]}>
            Members
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("courses")}
          style={[styles.segment, activeTab === "courses" ? styles.segmentActive : null]}
        >
          <Text style={[styles.segmentLabel, activeTab === "courses" ? styles.segmentLabelActive : null]}>
            Courses
          </Text>
        </Pressable>
      </View>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={searchPlaceholder}
        placeholderTextColor={colors.textTertiary}
        style={styles.search}
        autoCorrect={false}
      />
    </>
  );

  function handleLoadMoreCourses() {
    if (loadingCourses || loadingMoreCourses || !hasMoreCourses) return;
    void loadCoursesPage(query, courses.length, true);
  }

  return (
    <Screen
      title="Discover"
      subtitle="Members and courses across EliteTee."
      branded
      scroll={false}
      contentStyle={styles.screen}
    >
      {controls}

      {activeTab === "members" ? (
        loadingMembers && visibleMembers.length === 0 ? (
          <LoadingState label="Loading members…" />
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : visibleMembers.length === 0 ? (
          <EmptyState
            title="No members to show"
            body="Try a different search or check back as the directory grows."
          />
        ) : (
          <FlatList
            data={visibleMembers}
            keyExtractor={(member) => member.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item: member }) => (
              <MemberCard
                member={member}
                onPress={() =>
                  member.user_id ? router.push(`/members/${member.user_id}`) : undefined
                }
              />
            )}
          />
        )
      ) : loadingCourses && courses.length === 0 ? (
        <LoadingState label="Loading courses…" />
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(course) => course.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMoreCourses}
          onEndReachedThreshold={0.35}
          ListEmptyComponent={
            <EmptyState
              title="No courses found"
              body="Try a different search term to browse the full course directory."
            />
          }
          ListFooterComponent={
            loadingMoreCourses ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator color={colors.forest} size="small" />
                <Text style={styles.footerLabel}>Loading more courses…</Text>
              </View>
            ) : hasMoreCourses && courses.length > 0 ? (
              <Pressable onPress={handleLoadMoreCourses} style={styles.loadMore}>
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
      )}
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
  segmented: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: 4,
    borderRadius: radii.lg,
    backgroundColor: colors.bgInset,
  },
  segment: {
    flex: 1,
    minHeight: 40,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  segmentActive: {
    backgroundColor: colors.bgSurface,
    shadowColor: colors.shadowSm,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  segmentLabel: {
    fontFamily: typography.sansMedium,
    fontSize: 14,
    color: colors.textSecondary,
  },
  segmentLabelActive: {
    color: colors.forest,
  },
  search: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    backgroundColor: colors.bgSurface,
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
