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
};

/**
 * Course-detail experience card.
 * - Body tap → linked feed post when feed_post_id exists
 * - Member identity → /members/[userId]
 * - Photos → shared FeedPhotoGallery lightbox (no post navigation)
 */
export function RoundReviewCard({ round }: RoundReviewCardProps) {
  const router = useRouter();
  const ratingDisplay = formatCourseRatingDisplay(round.course_rating);
  const imageUrls = useMemo(
    () => buildRoundImageUrls(round.photos ?? [], round.cover_photo_id),
    [round.photos, round.cover_photo_id],
  );
  const feedPostId = round.feed_post_id?.trim() || null;
  const canOpenPost = Boolean(feedPostId);
  const galleryWidth =
    Dimensions.get("window").width - layout.pagePadding * 2 - spacing.lg * 2;

  function openPost() {
    if (!feedPostId) return;
    router.push(`/feed/${feedPostId}`);
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <MemberIdentityLink
          userId={round.member_user_id}
          name={round.member_name?.trim() || "Member"}
          size={40}
          style={styles.identity}
        />
        <Text style={styles.date}>{formatPlayedOnDate(round.played_on)}</Text>
      </View>

      <Pressable
        onPress={openPost}
        disabled={!canOpenPost}
        accessibilityRole={canOpenPost ? "button" : undefined}
        accessibilityLabel={canOpenPost ? "Open review post" : undefined}
        style={({ pressed }) => [
          styles.body,
          canOpenPost && pressed ? styles.bodyPressed : null,
        ]}
      >
        {ratingDisplay ? <Text style={styles.rating}>{ratingDisplay}/10</Text> : null}
        {round.would_play_again === false ? (
          <Text style={styles.wouldPlay}>Would play again · No</Text>
        ) : round.would_play_again ? (
          <Text style={styles.wouldPlay}>Would play again · Yes</Text>
        ) : null}
        {isMeaningfulDisplayValue(round.note) ? (
          <Text style={styles.note}>{round.note}</Text>
        ) : null}
        {canOpenPost ? <Text style={styles.openHint}>View full post</Text> : null}
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
  identity: {
    flex: 1,
    minWidth: 0,
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
