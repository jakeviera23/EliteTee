import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { InviteGolfer } from "@/components/referrals/InviteGolfer";
import { CourseCard } from "@/components/courses/CourseCard";
import { MemberCard } from "@/components/discover/MemberCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Screen } from "@/components/ui/Screen";
import { colors, radii, spacing, typography } from "@/constants/theme";
import {
  fetchGolfCourseDirectoryPage,
  fetchPopularGolfCourses,
  SEARCH_PAGE_SIZE,
} from "@/lib/api/courses";
import { appendUniqueCourses } from "@/lib/courseResultsAppend";
import { fetchDiscoverableMembers } from "@/lib/api/members";
import {
  DEFAULT_MOBILE_DISCOVER_FILTERS,
  buildFeaturedDiscoverSections,
  buildPrimaryMatchReason,
  countActiveMobileDiscoverFilters,
  extractMobileDiscoverFilterOptions,
  filterDiscoverMembers,
  hasUsableDiscoverUserId,
  sortDiscoverMembersAlphabetical,
  type MobileDiscoverFeaturedSection,
  type MobileDiscoverFilters,
} from "@/lib/discoverDirectory";
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

type MemberListSection = {
  title: string;
  key: string;
  data: MobileMemberProfile[];
  showReasons?: boolean;
};

function FilterChipRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (next: string) => void;
}) {
  if (options.length === 0) return null;

  return (
    <View style={styles.filterBlock}>
      <Text style={styles.filterLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
        <Pressable
          onPress={() => onChange("")}
          style={[styles.filterChip, !value ? styles.filterChipActive : null]}
        >
          <Text style={[styles.filterChipLabel, !value ? styles.filterChipLabelActive : null]}>
            Any
          </Text>
        </Pressable>
        {options.slice(0, 8).map((option) => {
          const active = value === option;
          return (
            <Pressable
              key={option}
              onPress={() => onChange(active ? "" : option)}
              style={[styles.filterChip, active ? styles.filterChipActive : null]}
            >
              <Text
                style={[styles.filterChipLabel, active ? styles.filterChipLabelActive : null]}
                numberOfLines={1}
              >
                {option}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function DiscoverScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<DiscoverTab>("members");
  const [memberQuery, setMemberQuery] = useState("");
  const [courseQuery, setCourseQuery] = useState("");
  const [memberFilters, setMemberFilters] = useState<MobileDiscoverFilters>(
    DEFAULT_MOBILE_DISCOVER_FILTERS,
  );
  const [showMemberFilters, setShowMemberFilters] = useState(false);
  const [members, setMembers] = useState<MobileMemberProfile[]>(
    () => getSessionCacheStale<MobileMemberProfile[]>(SESSION_CACHE_KEYS.discoverMembers) ?? [],
  );
  const [courses, setCourses] = useState<MobileGolfCourse[]>([]);
  const [popularCourses, setPopularCourses] = useState<MobileGolfCourse[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(() => members.length === 0);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingMoreCourses, setLoadingMoreCourses] = useState(false);
  const [hasMoreCourses, setHasMoreCourses] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [coursesError, setCoursesError] = useState<string | null>(null);
  const courseRequestId = useRef(0);
  const popularLoaded = useRef(false);

  const loadMembers = useCallback(async (options?: { background?: boolean }) => {
    const cached = getSessionCacheStale<MobileMemberProfile[]>(SESSION_CACHE_KEYS.discoverMembers);
    const hasCache = Boolean(cached?.length);

    if (hasCache) {
      setMembers(cached!);
      setLoadingMembers(false);
    } else if (!options?.background) {
      setLoadingMembers(true);
    }

    if (!hasCache) {
      setMembersError(null);
    }

    perfStart("discover-members");
    const { data, error: fetchError } = await fetchDiscoverableMembers();
    perfEnd("discover-members", { members: data.length, cached: hasCache });

    if (fetchError) {
      setMembersError(formatMobileError(fetchError.message));
      setMembers((current) => {
        if (current.length > 0) return current;
        return cached ?? [];
      });
    } else {
      setMembers(data);
      if (data.length > 0) {
        setSessionCache(SESSION_CACHE_KEYS.discoverMembers, data);
      }
      setMembersError(null);
    }

    setLoadingMembers(false);
  }, []);

  const loadPopularCourses = useCallback(async () => {
    if (popularLoaded.current) return;
    popularLoaded.current = true;
    const { data } = await fetchPopularGolfCourses(6);
    if (data.length > 0) {
      setPopularCourses(data);
    }
  }, []);

  const loadCoursesPage = useCallback(
    async (searchQuery: string, offset: number, append: boolean) => {
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
        setCoursesError(null);
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
          setCourses((current) => current);
          setCoursesError(formatMobileError(fetchError.message));
        }
        setHasMoreCourses(false);
      } else {
        setCourses((current) => (append ? appendUniqueCourses(current, data) : data));
        setHasMoreCourses(data.length === SEARCH_PAGE_SIZE);
        if (!append && data.length > 0) {
          setSessionCache(cacheKey, data);
        }
        if (!append) {
          setCoursesError(null);
        }
      }

      setLoadingCourses(false);
      setLoadingMoreCourses(false);
    },
    [],
  );

  useEffect(() => {
    const cached = getSessionCacheStale<MobileMemberProfile[]>(SESSION_CACHE_KEYS.discoverMembers);
    void loadMembers({ background: Boolean(cached?.length) });
  }, [loadMembers]);

  useEffect(() => {
    if (activeTab !== "courses") return;

    const timer = setTimeout(() => {
      void loadCoursesPage(courseQuery, 0, false);
      if (!courseQuery.trim()) {
        void loadPopularCourses();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [activeTab, courseQuery, loadCoursesPage, loadPopularCourses]);

  const effectiveMemberFilters = useMemo(
    (): MobileDiscoverFilters => ({
      ...memberFilters,
      query: memberQuery,
    }),
    [memberFilters, memberQuery],
  );

  const filterOptions = useMemo(
    () => extractMobileDiscoverFilterOptions(members),
    [members],
  );

  const activeFilterCount = countActiveMobileDiscoverFilters(effectiveMemberFilters);
  const isMemberBrowsing =
    !effectiveMemberFilters.query.trim() && activeFilterCount === 0;

  const directoryMembers = useMemo(() => {
    const others = members.filter(
      (member) =>
        hasUsableDiscoverUserId(member) && member.user_id !== user?.id,
    );
    return filterDiscoverMembers(others, effectiveMemberFilters);
  }, [effectiveMemberFilters, members, user?.id]);

  const featuredSections = useMemo(() => {
    if (!isMemberBrowsing) return [] as MobileDiscoverFeaturedSection[];
    return buildFeaturedDiscoverSections(members, profile);
  }, [isMemberBrowsing, members, profile]);

  const memberSections = useMemo((): MemberListSection[] => {
    if (!isMemberBrowsing) {
      return [
        {
          key: "results",
          title: directoryMembers.length === 1 ? "1 member" : `${directoryMembers.length} members`,
          data: sortDiscoverMembersAlphabetical(directoryMembers),
        },
      ];
    }

    const sections: MemberListSection[] = featuredSections.map((section) => ({
      key: section.id,
      title: section.title,
      data: section.members,
      showReasons: section.id === "suggested",
    }));

    sections.push({
      key: "all",
      title: "All members",
      data: sortDiscoverMembersAlphabetical(
        members.filter(
          (member) =>
            hasUsableDiscoverUserId(member) && member.user_id !== user?.id,
        ),
      ),
    });

    return sections.filter((section) => section.data.length > 0);
  }, [directoryMembers, featuredSections, isMemberBrowsing, members, user?.id]);

  const searchPlaceholder =
    activeTab === "members"
      ? "Search members by name, club, location, travel…"
      : "Search courses by name or location";

  const activeQuery = activeTab === "members" ? memberQuery : courseQuery;

  function setActiveQuery(next: string) {
    if (activeTab === "members") {
      setMemberQuery(next);
    } else {
      setCourseQuery(next);
    }
  }

  function handleLoadMoreCourses() {
    if (loadingCourses || loadingMoreCourses || !hasMoreCourses) return;
    void loadCoursesPage(courseQuery, courses.length, true);
  }

  function openMember(member: MobileMemberProfile) {
    if (!member.user_id) return;
    router.push(`/members/${member.user_id}`);
  }

  const memberListHeader = (
    <View style={styles.membersHeader}>
      <InviteGolfer variant="compact" />

      {membersError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{membersError}</Text>
          <Pressable onPress={() => void loadMembers()} style={styles.retryButton}>
            <Text style={styles.retryLabel}>Try again</Text>
          </Pressable>
        </View>
      ) : null}

      <Pressable
        onPress={() => setShowMemberFilters((current) => !current)}
        style={styles.filtersToggle}
      >
        <Text style={styles.filtersToggleLabel}>
          {showMemberFilters ? "Hide filters" : "Filters"}
          {activeFilterCount > 0 ? ` · ${activeFilterCount}` : ""}
        </Text>
      </Pressable>

      {showMemberFilters ? (
        <View style={styles.filtersPanel}>
          <FilterChipRow
            label="Club"
            options={filterOptions.clubs}
            value={memberFilters.club}
            onChange={(club) => setMemberFilters((current) => ({ ...current, club }))}
          />
          <FilterChipRow
            label="Location"
            options={filterOptions.locations}
            value={memberFilters.location}
            onChange={(location) => setMemberFilters((current) => ({ ...current, location }))}
          />
          <FilterChipRow
            label="Golf interest"
            options={filterOptions.golfInterests}
            value={memberFilters.golfInterest}
            onChange={(golfInterest) =>
              setMemberFilters((current) => ({ ...current, golfInterest }))
            }
          />
          {activeFilterCount > 0 ? (
            <Pressable
              onPress={() => setMemberFilters(DEFAULT_MOBILE_DISCOVER_FILTERS)}
              style={styles.clearFilters}
            >
              <Text style={styles.clearFiltersLabel}>Clear filters</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  const courseListHeader =
    !courseQuery.trim() && popularCourses.length > 0 ? (
      <View style={styles.popularBlock}>
        <Text style={styles.sectionTitle}>Popular</Text>
        <View style={styles.popularList}>
          {popularCourses.map((course) => (
            <CourseCard
              key={`popular-${course.id}`}
              course={course}
              onPress={() => router.push(`/courses/${course.slug}`)}
            />
          ))}
        </View>
      </View>
    ) : null;

  const controls = (
    <>
      <View style={styles.segmented}>
        <Pressable
          onPress={() => setActiveTab("members")}
          style={[styles.segment, activeTab === "members" ? styles.segmentActive : null]}
        >
          <Text
            style={[styles.segmentLabel, activeTab === "members" ? styles.segmentLabelActive : null]}
          >
            Members
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("courses")}
          style={[styles.segment, activeTab === "courses" ? styles.segmentActive : null]}
        >
          <Text
            style={[styles.segmentLabel, activeTab === "courses" ? styles.segmentLabelActive : null]}
          >
            Courses
          </Text>
        </Pressable>
      </View>

      <TextInput
        value={activeQuery}
        onChangeText={setActiveQuery}
        placeholder={searchPlaceholder}
        placeholderTextColor={colors.textTertiary}
        style={styles.search}
        autoCorrect={false}
      />
    </>
  );

  return (
    <Screen
      title="Discover"
      subtitle="Find members and courses worth connecting around."
      branded
      scroll={false}
      contentStyle={styles.screen}
    >
      {controls}

      {activeTab === "members" ? (
        loadingMembers && members.length === 0 ? (
          <LoadingState label="Loading members…" />
        ) : memberSections.every((section) => section.data.length === 0) && !loadingMembers ? (
          <View style={styles.flexFill}>
            {memberListHeader}
            <EmptyState
              title="No members to show"
              body="Try a different search or clear filters as the directory grows."
            />
          </View>
        ) : (
          <SectionList
            sections={memberSections}
            keyExtractor={(member) => member.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            stickySectionHeadersEnabled={false}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={memberListHeader}
            renderSectionHeader={({ section }) => (
              <Text style={styles.sectionTitle}>{section.title}</Text>
            )}
            renderItem={({ item, section }) => (
              <MemberCard
                member={item}
                matchReason={
                  section.showReasons ? buildPrimaryMatchReason(profile, item) : null
                }
                onPress={() => openMember(item)}
              />
            )}
          />
        )
      ) : loadingCourses && courses.length === 0 ? (
        <LoadingState label="Loading courses…" />
      ) : coursesError && courses.length === 0 ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{coursesError}</Text>
          <Pressable
            onPress={() => void loadCoursesPage(courseQuery, 0, false)}
            style={styles.retryButton}
          >
            <Text style={styles.retryLabel}>Try again</Text>
          </Pressable>
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
          ListHeaderComponent={
            <>
              {coursesError ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{coursesError}</Text>
                  <Pressable
                    onPress={() => void loadCoursesPage(courseQuery, 0, false)}
                    style={styles.retryButton}
                  >
                    <Text style={styles.retryLabel}>Try again</Text>
                  </Pressable>
                </View>
              ) : null}
              {courseListHeader}
            </>
          }
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
  flexFill: {
    flex: 1,
    gap: spacing.md,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  membersHeader: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
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
  sectionTitle: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    fontFamily: typography.sansSemibold,
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.textTertiary,
  },
  filtersToggle: {
    alignSelf: "flex-start",
    paddingVertical: spacing.xs,
  },
  filtersToggleLabel: {
    fontFamily: typography.sansMedium,
    fontSize: 13,
    color: colors.forest,
  },
  filtersPanel: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    backgroundColor: colors.bgSurface,
  },
  filterBlock: {
    gap: spacing.xs,
  },
  filterLabel: {
    fontFamily: typography.sansMedium,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.textTertiary,
  },
  filterChips: {
    gap: spacing.xs,
    paddingVertical: 2,
  },
  filterChip: {
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    backgroundColor: colors.bgInset,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    maxWidth: 180,
  },
  filterChipActive: {
    borderColor: colors.forestBorder,
    backgroundColor: colors.forestSoft,
  },
  filterChipLabel: {
    fontFamily: typography.sans,
    fontSize: 12,
    color: colors.textSecondary,
  },
  filterChipLabelActive: {
    color: colors.forest,
    fontFamily: typography.sansMedium,
  },
  clearFilters: {
    alignSelf: "flex-start",
    paddingTop: spacing.xs,
  },
  clearFiltersLabel: {
    fontFamily: typography.sansMedium,
    fontSize: 13,
    color: colors.forest,
  },
  popularBlock: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  popularList: {
    gap: spacing.md,
  },
  errorBox: {
    padding: spacing.lg,
    backgroundColor: colors.errorSoft,
    borderRadius: radii.lg,
    gap: spacing.sm,
  },
  errorText: {
    fontFamily: typography.sans,
    fontSize: 14,
    color: colors.error,
  },
  retryButton: {
    alignSelf: "flex-start",
    paddingVertical: spacing.xs,
  },
  retryLabel: {
    fontFamily: typography.sansMedium,
    fontSize: 14,
    color: colors.forest,
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
