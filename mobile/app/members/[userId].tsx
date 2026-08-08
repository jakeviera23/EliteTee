import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { FeedPostCard } from "@/components/feed/FeedPostCard";
import { EliteTeeMark } from "@/components/brand/EliteTeeMark";
import { ProfileCoverFallback } from "@/components/profile/ProfileCoverFallback";
import { Button } from "@/components/ui/Button";
import { Card, SectionTitle } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";
import { MemberAvatar } from "@/components/ui/MemberAvatar";
import { colors, layout, radii, spacing, typography } from "@/constants/theme";
import {
  fetchMemberProfileFeedPosts,
  fetchMemberProfileIdentity,
  fetchMemberProfileSecondary,
  type MemberProfileIdentity,
  type MemberProfileSecondary,
} from "@/lib/api/memberProfile";
import { formatMobileError } from "@/lib/errors";
import { perfEnd, perfStart } from "@/lib/perfTiming";
import {
  SESSION_CACHE_KEYS,
  getSessionCacheStale,
  setSessionCache,
} from "@/lib/sessionCache";
import { isMeaningfulDisplayValue } from "@/lib/display";
import { buildGolferProfileDisplay } from "@/lib/portalProfileDisplay";
import {
  buildProfileExperienceStats,
  buildUniqueCoursesPlayed,
  formatProfileCoursePlayedMeta,
} from "@/lib/profilePageDisplay";
import { useAuth } from "@/hooks/AuthProvider";
import type { MobileFeedPost } from "@/types/feed";

function ProfileSection({ title, children }: { title: string; children: ReactNode }) {
  if (!children) return null;
  return (
    <Card>
      <SectionTitle>{title}</SectionTitle>
      <View style={styles.sectionBody}>{children}</View>
    </Card>
  );
}

function TagList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <View style={styles.tagRow}>
      {items.map((item) => (
        <View key={item} style={styles.tag}>
          <Text style={styles.tagLabel}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export default function MemberProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [identity, setIdentity] = useState<MemberProfileIdentity | null>(() =>
    userId ? getSessionCacheStale<MemberProfileIdentity>(SESSION_CACHE_KEYS.profileIdentity(userId)) : null,
  );
  const [secondary, setSecondary] = useState<MemberProfileSecondary | null>(() =>
    userId ? getSessionCacheStale<MemberProfileSecondary>(SESSION_CACHE_KEYS.profileSecondary(userId)) : null,
  );
  const [recentFeedPosts, setRecentFeedPosts] = useState<MobileFeedPost[]>(() =>
    userId ? getSessionCacheStale<MobileFeedPost[]>(SESSION_CACHE_KEYS.profileFeedPosts(userId)) ?? [] : [],
  );
  const [loadingIdentity, setLoadingIdentity] = useState(() => !identity);
  const [loadingSecondary, setLoadingSecondary] = useState(() => !secondary);
  const [loadingFeedPosts, setLoadingFeedPosts] = useState(() => recentFeedPosts.length === 0);
  const [error, setError] = useState<string | null>(null);

  const isOwnProfile = user?.id === userId;

  useEffect(() => {
    if (!userId) return;

    let active = true;
    const cachedIdentity = getSessionCacheStale<MemberProfileIdentity>(
      SESSION_CACHE_KEYS.profileIdentity(userId),
    );
    const cachedSecondary = getSessionCacheStale<MemberProfileSecondary>(
      SESSION_CACHE_KEYS.profileSecondary(userId),
    );
    const cachedFeedPosts = getSessionCacheStale<MobileFeedPost[]>(
      SESSION_CACHE_KEYS.profileFeedPosts(userId),
    );

    if (cachedIdentity) {
      setIdentity(cachedIdentity);
      setLoadingIdentity(false);
    } else {
      setLoadingIdentity(true);
    }

    if (cachedSecondary) {
      setSecondary(cachedSecondary);
      setLoadingSecondary(false);
    } else {
      setLoadingSecondary(true);
    }

    if (cachedFeedPosts?.length) {
      setRecentFeedPosts(cachedFeedPosts);
      setLoadingFeedPosts(false);
    } else {
      setLoadingFeedPosts(true);
    }

    setError(null);

    void (async () => {
      perfStart("profile-identity");
      const { data: identityData, error: identityError } = await fetchMemberProfileIdentity(userId);
      perfEnd("profile-identity", { cached: Boolean(cachedIdentity) });

      if (!active) return;

      if (identityError || !identityData) {
        setError(formatMobileError(identityError?.message ?? "Member profile unavailable."));
        setLoadingIdentity(false);
        setLoadingSecondary(false);
        setLoadingFeedPosts(false);
        return;
      }

      setIdentity(identityData);
      setSessionCache(SESSION_CACHE_KEYS.profileIdentity(userId), identityData);
      setLoadingIdentity(false);

      perfStart("profile-secondary");
      const { data: secondaryData, error: secondaryError } = await fetchMemberProfileSecondary(
        userId,
        identityData.member,
        user?.id === userId,
      );
      perfEnd("profile-secondary", { cached: Boolean(cachedSecondary) });

      if (!active) return;

      if (secondaryError || !secondaryData) {
        setError(formatMobileError(secondaryError?.message ?? "Member profile unavailable."));
        setLoadingSecondary(false);
        setLoadingFeedPosts(false);
        return;
      }

      setSecondary(secondaryData);
      setSessionCache(SESSION_CACHE_KEYS.profileSecondary(userId), secondaryData);
      setLoadingSecondary(false);

      const { data: feedPosts } = await fetchMemberProfileFeedPosts(userId, 3);
      if (!active) return;
      setRecentFeedPosts(feedPosts);
      if (feedPosts.length > 0) {
        setSessionCache(SESSION_CACHE_KEYS.profileFeedPosts(userId), feedPosts);
      }
      setLoadingFeedPosts(false);
    })();

    return () => {
      active = false;
    };
  }, [user?.id, userId]);

  const display = useMemo(
    () => (identity ? buildGolferProfileDisplay(identity.member) : null),
    [identity],
  );

  const memberName = display?.name || identity?.member.full_name?.trim() || "";

  const stats = useMemo(
    () =>
      secondary
        ? buildProfileExperienceStats(
            secondary.courseRounds,
            secondary.feedPostCount,
            secondary.connectionCount,
          )
        : null,
    [secondary],
  );

  const coursesPlayed = useMemo(
    () => (secondary ? buildUniqueCoursesPlayed(secondary.courseRounds).slice(0, 8) : []),
    [secondary],
  );

  const recentRounds = secondary?.courseRounds.slice(0, 3) ?? [];
  const showConnections = isOwnProfile && (stats?.connections ?? 0) > 0;

  if (loadingIdentity && !identity) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <LoadingState label="Loading member profile…" fullScreen />
      </SafeAreaView>
    );
  }

  if (error || !identity || !display) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.toolbar}>
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={colors.forest} />
          </Pressable>
        </View>
        <Text style={styles.errorText}>{error ?? "Member profile unavailable."}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.toolbar}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.forest} />
        </Pressable>
        <EliteTeeMark size={42} />
        <View style={styles.toolbarSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          {identity.media.coverImageUrl ? (
            <Image source={{ uri: identity.media.coverImageUrl }} style={styles.coverImage} />
          ) : (
            <ProfileCoverFallback height={140} />
          )}
          <View style={styles.avatarWrap}>
            <MemberAvatar
              name={memberName}
              imageUrl={identity.media.avatarImageUrl ?? identity.member.club_logo_url}
              size={84}
              style={styles.avatar}
            />
          </View>
        </View>

        <View style={styles.identity}>
          {memberName ? <Text style={styles.name}>{memberName}</Text> : null}
          {display.title ? <Text style={styles.title}>Industry · {display.title}</Text> : null}
          {display.location ? <Text style={styles.meta}>{display.location}</Text> : null}
          {display.homeCourse ? <Text style={styles.meta}>Home club · {display.homeCourse}</Text> : null}
          {display.foundingMemberNumber ? (
            <Text style={styles.founding}>Founding member #{display.foundingMemberNumber}</Text>
          ) : null}
        </View>

        {!isOwnProfile ? (
          <View style={styles.actions}>
            <Button
              label="Message"
              onPress={() =>
                router.push({
                  pathname: "/(app)/messages/[userId]",
                  params: { userId: identity.member.user_id!, memberName },
                })
              }
            />
            <Button
              label="Request Introduction"
              variant="secondary"
              onPress={() => router.push("/introductions")}
            />
          </View>
        ) : null}

        {loadingSecondary && !secondary ? (
          <Card>
            <Text style={styles.body}>Loading experience…</Text>
          </Card>
        ) : null}

        {stats ? (
          <Card>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{stats.roundsShared}</Text>
                <Text style={styles.statLabel}>Rounds</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{stats.coursesPlayed}</Text>
                <Text style={styles.statLabel}>Courses</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{stats.feedPosts}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
              {showConnections ? (
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{stats.connections}</Text>
                  <Text style={styles.statLabel}>Connections</Text>
                </View>
              ) : null}
            </View>
          </Card>
        ) : null}

        {display.bio ? (
          <ProfileSection title="Current request">
            <Text style={styles.body}>{display.bio}</Text>
          </ProfileSection>
        ) : null}

        <ProfileSection title="Golf">
          {display.homeCourse ? <Text style={styles.body}>Home club: {display.homeCourse}</Text> : null}
          {isOwnProfile && display.handicap !== undefined ? (
            <Text style={styles.body}>Handicap: {display.handicap}</Text>
          ) : null}
          {display.favoriteCourses.length > 0 ? (
            <>
              <Text style={styles.subheading}>Other clubs & courses</Text>
              <TagList items={display.favoriteCourses} />
            </>
          ) : null}
        </ProfileSection>

        {display.connectionInterests.length > 0 ? (
          <ProfileSection title="Interests">
            <TagList items={display.connectionInterests} />
          </ProfileSection>
        ) : null}

        {(isMeaningfulDisplayValue(identity.member.industry) ||
          display.businessInterests.length > 0) && (
          <ProfileSection title="Business">
            {isMeaningfulDisplayValue(identity.member.industry) ? (
              <Text style={styles.body}>{identity.member.industry}</Text>
            ) : null}
            {display.businessInterests.length > 0 ? (
              <TagList items={display.businessInterests} />
            ) : null}
          </ProfileSection>
        )}

        {display.upcomingTravel || identity.member.regions.filter(isMeaningfulDisplayValue).length > 0 ? (
          <ProfileSection title="Travel">
            {display.upcomingTravel ? (
              <Text style={styles.body}>Traveling to {display.upcomingTravel}</Text>
            ) : null}
            {identity.member.regions.filter(isMeaningfulDisplayValue).length > 0 ? (
              <>
                <Text style={styles.subheading}>Regions</Text>
                <TagList items={identity.member.regions.filter(isMeaningfulDisplayValue)} />
              </>
            ) : null}
          </ProfileSection>
        ) : null}

        {coursesPlayed.length > 0 ? (
          <ProfileSection title="Courses played">
            {coursesPlayed.map((course) => (
              <Pressable
                key={course.key}
                onPress={() => course.courseSlug && router.push(`/courses/${course.courseSlug}`)}
                style={styles.courseRow}
              >
                <Text style={styles.courseName}>{course.courseName}</Text>
                <Text style={styles.courseMeta}>{formatProfileCoursePlayedMeta(course)}</Text>
              </Pressable>
            ))}
          </ProfileSection>
        ) : null}

        {isOwnProfile && (secondary?.bucketListCourses.length ?? 0) > 0 ? (
          <ProfileSection title="Bucket list">
            {secondary!.bucketListCourses.map((course) => (
              <Pressable
                key={course.id}
                onPress={() => router.push(`/courses/${course.slug}`)}
                style={styles.courseRow}
              >
                <Text style={styles.courseName}>{course.name}</Text>
                {course.location ? <Text style={styles.courseMeta}>{course.location}</Text> : null}
              </Pressable>
            ))}
          </ProfileSection>
        ) : null}

        {recentRounds.length > 0 ? (
          <ProfileSection title="Recent experiences">
            {recentRounds.map((round) => (
              <View key={round.id} style={styles.courseRow}>
                <Text style={styles.courseName}>{round.course_name}</Text>
                {isMeaningfulDisplayValue(round.note) ? (
                  <Text style={styles.body}>{round.note}</Text>
                ) : null}
              </View>
            ))}
          </ProfileSection>
        ) : null}

        {loadingFeedPosts && recentFeedPosts.length === 0 ? (
          <Card>
            <Text style={styles.body}>Loading recent activity…</Text>
          </Card>
        ) : null}

        {recentFeedPosts.length > 0 ? (
          <ProfileSection title="Recent feed activity">
            {recentFeedPosts.map((post) => (
              <FeedPostCard key={post.id} post={post} />
            ))}
          </ProfileSection>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: layout.pagePadding,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderHairline,
  },
  toolbarSpacer: {
    width: 36,
  },
  content: {
    paddingHorizontal: layout.pagePadding,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  hero: {
    marginTop: spacing.xs,
    marginBottom: spacing.xxxl,
  },
  coverImage: {
    width: "100%",
    height: 140,
    borderRadius: radii.lg,
    backgroundColor: colors.bgInset,
  },
  avatarWrap: {
    position: "absolute",
    left: spacing.lg,
    bottom: -24,
  },
  avatar: {
    borderWidth: 3,
    borderColor: colors.bgBase,
  },
  identity: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  name: {
    fontFamily: typography.serifSemibold,
    fontSize: 30,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  title: {
    fontFamily: typography.sans,
    fontSize: typography.body,
    color: colors.textSecondary,
  },
  meta: {
    fontFamily: typography.sans,
    fontSize: typography.bodySm,
    color: colors.textSecondary,
  },
  founding: {
    fontFamily: typography.sansMedium,
    fontSize: typography.caption,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.gold,
    marginTop: spacing.xs,
  },
  actions: {
    gap: spacing.sm,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontFamily: typography.serifSemibold,
    fontSize: 24,
    color: colors.forest,
  },
  statLabel: {
    fontFamily: typography.sans,
    fontSize: typography.caption,
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  sectionBody: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  body: {
    fontFamily: typography.sans,
    fontSize: typography.body,
    lineHeight: 23,
    color: colors.textSecondary,
  },
  subheading: {
    marginTop: spacing.sm,
    fontFamily: typography.sansMedium,
    fontSize: typography.label,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.textTertiary,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  tag: {
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    backgroundColor: colors.bgInset,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  tagLabel: {
    fontFamily: typography.sans,
    fontSize: typography.bodySm,
    color: colors.textSecondary,
  },
  courseRow: {
    paddingVertical: spacing.sm,
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
  errorText: {
    paddingHorizontal: layout.pagePadding,
    fontFamily: typography.sans,
    fontSize: typography.body,
    color: colors.error,
  },
});
