import { Children, useEffect, useMemo, useState, type ReactNode } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { RoundReviewCard } from "@/components/courses/RoundReviewCard";
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
import { attachPhotosToRounds } from "@/lib/api/courseRoundPhotos";
import {
  resolveFeedPostsMedia,
  stripFeedPostSignedMedia,
} from "@/lib/api/feed";
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

function stripSecondarySignedMedia(secondary: MemberProfileSecondary): MemberProfileSecondary {
  return {
    ...secondary,
    courseRounds: secondary.courseRounds.map((round) => ({
      ...round,
      photos: (round.photos ?? []).map((photo) => ({
        ...photo,
        signed_url: undefined,
      })),
    })),
  };
}

function ProfileSection({ title, children }: { title: string; children: ReactNode }) {
  const items = Children.toArray(children).filter(Boolean);
  if (items.length === 0) return null;
  return (
    <Card>
      <SectionTitle>{title}</SectionTitle>
      <View style={styles.sectionBody}>{items}</View>
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

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0]?.trim() ?? "";
  return value?.trim() ?? "";
}

export default function MemberProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ userId: string }>();
  const userId = firstParam(params.userId);
  const [identity, setIdentity] = useState<MemberProfileIdentity | null>(() =>
    userId ? getSessionCacheStale<MemberProfileIdentity>(SESSION_CACHE_KEYS.profileIdentity(userId)) : null,
  );
  const [secondary, setSecondary] = useState<MemberProfileSecondary | null>(() => {
    if (!userId) return null;
    const cached = getSessionCacheStale<MemberProfileSecondary>(
      SESSION_CACHE_KEYS.profileSecondary(userId),
    );
    return cached ? stripSecondarySignedMedia(cached) : null;
  });
  const [recentFeedPosts, setRecentFeedPosts] = useState<MobileFeedPost[]>(() => {
    if (!userId) return [];
    const cached = getSessionCacheStale<MobileFeedPost[]>(
      SESSION_CACHE_KEYS.profileFeedPosts(userId),
    );
    return cached ? stripFeedPostSignedMedia(cached) : [];
  });
  const [loadingIdentity, setLoadingIdentity] = useState(() => !identity);
  const [loadingSecondary, setLoadingSecondary] = useState(() => !secondary);
  const [loadingFeedPosts, setLoadingFeedPosts] = useState(() => recentFeedPosts.length === 0);
  const [error, setError] = useState<string | null>(null);

  const isOwnProfile = Boolean(user?.id && userId && user.id === userId);

  useEffect(() => {
    if (!userId) return;

    let active = true;
    const cachedIdentity = getSessionCacheStale<MemberProfileIdentity>(
      SESSION_CACHE_KEYS.profileIdentity(userId),
    );
    const cachedSecondaryRaw = getSessionCacheStale<MemberProfileSecondary>(
      SESSION_CACHE_KEYS.profileSecondary(userId),
    );
    const cachedSecondary = cachedSecondaryRaw
      ? stripSecondarySignedMedia(cachedSecondaryRaw)
      : null;
    const cachedFeedPostsRaw = getSessionCacheStale<MobileFeedPost[]>(
      SESSION_CACHE_KEYS.profileFeedPosts(userId),
    );
    const cachedFeedPosts = cachedFeedPostsRaw
      ? stripFeedPostSignedMedia(cachedFeedPostsRaw)
      : null;

    if (cachedIdentity) {
      setIdentity(cachedIdentity);
      setLoadingIdentity(false);
    } else {
      setLoadingIdentity(true);
    }

    if (cachedSecondary) {
      setSecondary(cachedSecondary);
      setLoadingSecondary(false);
      void attachPhotosToRounds(cachedSecondary.courseRounds).then((rounds) => {
        if (!active) return;
        setSecondary({ ...cachedSecondary, courseRounds: rounds });
      });
    } else {
      setLoadingSecondary(true);
    }

    if (cachedFeedPosts?.length) {
      setRecentFeedPosts(cachedFeedPosts);
      setLoadingFeedPosts(false);
      void resolveFeedPostsMedia(cachedFeedPosts).then((resolved) => {
        if (!active) return;
        setRecentFeedPosts(resolved);
      });
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

      // Never surface email on profile screens.
      const safeIdentity: MemberProfileIdentity = {
        ...identityData,
        member: { ...identityData.member, email: "" },
      };

      setIdentity(safeIdentity);
      setSessionCache(SESSION_CACHE_KEYS.profileIdentity(userId), safeIdentity);
      setLoadingIdentity(false);

      const own = user?.id === userId;
      perfStart("profile-secondary");
      const [secondaryResult, feedResult] = await Promise.all([
        fetchMemberProfileSecondary(userId, safeIdentity.member, own),
        fetchMemberProfileFeedPosts(userId, 5),
      ]);
      perfEnd("profile-secondary", { cached: Boolean(cachedSecondary) });

      if (!active) return;

      if (secondaryResult.error || !secondaryResult.data) {
        setError(
          formatMobileError(secondaryResult.error?.message ?? "Member profile unavailable."),
        );
        setLoadingSecondary(false);
        setLoadingFeedPosts(false);
        return;
      }

      setSecondary(secondaryResult.data);
      setSessionCache(
        SESSION_CACHE_KEYS.profileSecondary(userId),
        stripSecondarySignedMedia(secondaryResult.data),
      );
      setLoadingSecondary(false);

      setRecentFeedPosts(feedResult.data);
      if (feedResult.data.length > 0) {
        setSessionCache(
          SESSION_CACHE_KEYS.profileFeedPosts(userId),
          stripFeedPostSignedMedia(feedResult.data),
        );
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
  const targetUserId = identity?.member.user_id?.trim() || userId;

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
  const regions = identity?.member.regions.filter(isMeaningfulDisplayValue) ?? [];
  const hasGolfSection =
    Boolean(display?.homeCourse) ||
    (isOwnProfile && display?.handicap !== undefined) ||
    (display?.favoriteCourses.length ?? 0) > 0;

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
            <Image
              source={{ uri: identity.media.coverImageUrl }}
              style={styles.coverImage}
              onError={() => undefined}
            />
          ) : (
            <ProfileCoverFallback height={160} />
          )}
          <View style={styles.avatarWrap}>
            <MemberAvatar
              name={memberName}
              imageUrl={identity.media.avatarImageUrl ?? identity.member.club_logo_url}
              size={88}
              style={styles.avatar}
            />
          </View>
        </View>

        <View style={styles.identity}>
          {memberName ? <Text style={styles.name}>{memberName}</Text> : null}
          <View style={styles.badgeRow}>
            {display.foundingMemberNumber ? (
              <Text style={styles.founding}>Founding Member #{display.foundingMemberNumber}</Text>
            ) : null}
            {display.isVerified ? <Text style={styles.verified}>Verified</Text> : null}
          </View>
          {display.title ? <Text style={styles.title}>{display.title}</Text> : null}
          {display.homeCourse ? <Text style={styles.meta}>Home club · {display.homeCourse}</Text> : null}
          {display.location ? <Text style={styles.meta}>{display.location}</Text> : null}
          {display.bio ? (
            <Text style={styles.requestPreview} numberOfLines={3}>
              Looking for · {display.bio}
            </Text>
          ) : null}
        </View>

        {isOwnProfile ? (
          <Button
            label="Edit profile"
            variant="secondary"
            onPress={() => router.push("/(app)/profile/edit")}
          />
        ) : targetUserId ? (
          <View style={styles.actions}>
            <Button
              label="Message"
              onPress={() =>
                router.push({
                  pathname: "/(app)/messages/[userId]",
                  params: { userId: targetUserId, memberName },
                })
              }
            />
            <Button
              label="Request Introduction"
              variant="secondary"
              onPress={() =>
                router.push({
                  pathname: "/introductions",
                  params: {
                    targetUserId,
                    targetMemberName: memberName,
                    openComposer: "1",
                  },
                })
              }
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

        {hasGolfSection ? (
          <ProfileSection title="Golf">
            {display.homeCourse ? (
              <Text style={styles.body}>Home club: {display.homeCourse}</Text>
            ) : null}
            {isOwnProfile && display.handicap !== undefined ? (
              <Text style={styles.body}>Handicap: {display.handicap}</Text>
            ) : null}
            {display.favoriteCourses.length > 0 ? (
              <>
                <Text style={styles.subheading}>Favorite courses</Text>
                <TagList items={display.favoriteCourses} />
              </>
            ) : null}
          </ProfileSection>
        ) : null}

        {display.bio ? (
          <ProfileSection title="Looking for">
            <Text style={styles.body}>{display.bio}</Text>
          </ProfileSection>
        ) : null}

        {display.connectionInterests.length > 0 ? (
          <ProfileSection title="Interests">
            <TagList items={display.connectionInterests} />
          </ProfileSection>
        ) : null}

        {display.upcomingTravel || regions.length > 0 ? (
          <ProfileSection title="Travel">
            {display.upcomingTravel ? (
              <Text style={styles.body}>Traveling to {display.upcomingTravel}</Text>
            ) : null}
            {regions.length > 0 ? (
              <>
                <Text style={styles.subheading}>Regions</Text>
                <TagList items={regions} />
              </>
            ) : null}
          </ProfileSection>
        ) : null}

        {isMeaningfulDisplayValue(identity.member.industry) ||
        display.businessInterests.length > 0 ? (
          <ProfileSection title="Professional">
            {isMeaningfulDisplayValue(identity.member.industry) ? (
              <Text style={styles.body}>{identity.member.industry}</Text>
            ) : null}
            {display.businessInterests.length > 0 ? (
              <TagList items={display.businessInterests} />
            ) : null}
          </ProfileSection>
        ) : null}

        {coursesPlayed.length > 0 ? (
          <ProfileSection title="Courses played">
            {coursesPlayed.map((course) => (
              <Pressable
                key={course.key}
                onPress={() =>
                  course.courseSlug ? router.push(`/courses/${course.courseSlug}`) : undefined
                }
                disabled={!course.courseSlug}
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
              <RoundReviewCard
                key={round.id}
                variant="compact"
                round={{
                  ...round,
                  member_name: memberName || "Member",
                  member_user_id: round.member_user_id || targetUserId,
                }}
              />
            ))}
          </ProfileSection>
        ) : null}

        {loadingFeedPosts && recentFeedPosts.length === 0 ? (
          <Card>
            <Text style={styles.body}>Loading recent activity…</Text>
          </Card>
        ) : null}

        {recentFeedPosts.length > 0 ? (
          <ProfileSection title="Posts">
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
    height: 160,
    borderRadius: radii.lg,
    backgroundColor: colors.bgInset,
  },
  avatarWrap: {
    position: "absolute",
    left: spacing.lg,
    bottom: -28,
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
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: 2,
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
  requestPreview: {
    marginTop: spacing.sm,
    fontFamily: typography.sans,
    fontSize: typography.bodySm,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  founding: {
    fontFamily: typography.sansMedium,
    fontSize: typography.caption,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.gold,
  },
  verified: {
    fontFamily: typography.sansMedium,
    fontSize: typography.caption,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.forest,
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
