import { useMemo } from "react";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { FeedPhotoGallery } from "@/components/feed/FeedPhotoGallery";
import { MemberIdentityLink } from "@/components/member/MemberIdentityLink";
import { colors, layout, radii, spacing, typography } from "@/constants/theme";
import { formatCourseRatingDisplay } from "@/lib/courseRating";
import { formatPlayedOnDate } from "@/lib/api/courseRounds";
import { buildRoundImageUrls } from "@/lib/courseRoundCoverPhoto";
import type { MobileCourseRoundRecord } from "@/types/courseRoundPhoto";
import { isMeaningfulDisplayValue } from "@/lib/display";

type RoundReviewCardProps = {
  round: MobileCourseRoundRecord;
  /**
   * `default` — Course Detail member experience (member identity + full note).
   * `compact` — Profile Recent Experiences (course name + truncated note).
   */
  variant?: "default" | "compact";
};

/**
 * Course experience card.
 * - Body tap → linked feed post when feed_post_id exists
 * - Compact fallback → course detail when a slug is available
 * - Member identity → /members/[userId] (default variant only)
 * - Photos → shared FeedPhotoGallery lightbox (no post navigation)
 */
export function RoundReviewCard({ round, variant = "default" }: RoundReviewCardProps) {
  const router = useRouter();
  const compact = variant === "compact";
  const ratingDisplay = formatCourseRatingDisplay(round.course_rating);
  const imageUrls = useMemo(
    () => buildRoundImageUrls(round.photos ?? [], round.cover_photo_id),
    [round.photos, round.cover_photo_id],
  );
  const feedPostId = round.feed_post_id?.trim() || null;
  const courseSlug = round.course_slug?.trim() || "";
  const courseName = round.course_name?.trim() || "Course experience";
  const canOpenPost = Boolean(feedPostId);
  const canOpenCourse = Boolean(courseSlug);
  const canOpenBody = canOpenPost || (compact && canOpenCourse);
  const galleryWidth =
    Dimensions.get("window").width - layout.pagePadding * 2 - spacing.lg * 2;

  function openBody() {
    if (feedPostId) {
      router.push(`/feed/${feedPostId}`);
      return;
    }
    if (compact && courseSlug) {
      router.push({
        pathname: "/courses/[slug]",
        params: { slug: courseSlug, highlightRoundId: round.id },
      });
    }
  }

  const openHint = canOpenPost
    ? "View full post"
    : compact && canOpenCourse
      ? "View course"
      : null;

  return (
    <View style={styles.card}>
      {compact ? (
        <View style={styles.compactHeader}>
          <Text style={styles.courseName} numberOfLines={2}>
            {courseName}
          </Text>
          <Text style={styles.date}>{formatPlayedOnDate(round.played_on)}</Text>
        </View>
      ) : (
        <View style={styles.header}>
          <MemberIdentityLink
            userId={round.member_user_id}
            name={round.member_name?.trim() || "Member"}
            size={40}
            style={styles.identity}
          />
          <Text style={styles.date}>{formatPlayedOnDate(round.played_on)}</Text>
        </View>
      )}

      <Pressable
        onPress={openBody}
        disabled={!canOpenBody}
        accessibilityRole={canOpenBody ? "button" : undefined}
        accessibilityLabel={
          canOpenPost ? "Open review post" : canOpenCourse ? "Open course" : undefined
        }
        style={({ pressed }) => [
          styles.body,
          canOpenBody && pressed ? styles.bodyPressed : null,
        ]}
      >
        {ratingDisplay ? <Text style={styles.rating}>{ratingDisplay}/10</Text> : null}
        {round.would_play_again === false ? (
          <Text style={styles.wouldPlay}>Would play again · No</Text>
        ) : round.would_play_again ? (
          <Text style={styles.wouldPlay}>Would play again · Yes</Text>
        ) : null}
        {isMeaningfulDisplayValue(round.note) ? (
          <Text style={styles.note} numberOfLines={compact ? 4 : undefined}>
            {round.note}
          </Text>
        ) : null}
        {openHint ? <Text style={styles.openHint}>{openHint}</Text> : null}
      </Pressable>

      {/* Gallery stays outside the body press target so lightbox taps do not open the post. */}
      <FeedPhotoGallery
        imageUrls={imageUrls}
        rating={round.course_rating}
        contentWidth={galleryWidth}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  compactHeader: {
    gap: spacing.xs,
  },
  identity: {
    flex: 1,
    minWidth: 0,
  },
  courseName: {
    fontFamily: typography.serifSemibold,
    fontSize: 18,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  date: {
    fontFamily: typography.sans,
    fontSize: 12,
    color: colors.textTertiary,
    flexShrink: 0,
    paddingTop: 2,
  },
  body: {
    gap: spacing.xs,
  },
  bodyPressed: {
    opacity: 0.92,
  },
  rating: {
    fontFamily: typography.sansMedium,
    fontSize: 13,
    color: colors.gold,
  },
  wouldPlay: {
    fontFamily: typography.sans,
    fontSize: 12,
    color: colors.textTertiary,
  },
  note: {
    fontFamily: typography.sans,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  openHint: {
    marginTop: spacing.xs,
    fontFamily: typography.sansMedium,
    fontSize: 12,
    color: colors.forest,
  },
});
