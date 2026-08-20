import { useMemo, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, typography } from "@/constants/theme";
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
 * Uses the same cover-first signed URL ordering as the home feed gallery.
 * Never renders a blank media rectangle when URLs are missing or fail to load.
 */
export function RoundReviewCard({ round }: RoundReviewCardProps) {
  const ratingDisplay = formatCourseRatingDisplay(round.course_rating);
  const imageUrls = useMemo(
    () => buildRoundImageUrls(round.photos ?? [], round.cover_photo_id),
    [round.photos, round.cover_photo_id],
  );
  const [failedUrls, setFailedUrls] = useState<Record<string, true>>({});
  const visibleUrls = imageUrls.filter((url) => !failedUrls[url]);
  const primaryUrl = visibleUrls[0] ?? null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.member} numberOfLines={1}>
          {round.member_name?.trim() || "Member"}
        </Text>
        <Text style={styles.date}>{formatPlayedOnDate(round.played_on)}</Text>
      </View>
      {ratingDisplay ? <Text style={styles.rating}>{ratingDisplay}/10</Text> : null}
      {round.would_play_again === false ? (
        <Text style={styles.wouldPlay}>Would play again · No</Text>
      ) : round.would_play_again ? (
        <Text style={styles.wouldPlay}>Would play again · Yes</Text>
      ) : null}
      {isMeaningfulDisplayValue(round.note) ? (
        <Text style={styles.note}>{round.note}</Text>
      ) : null}
      {primaryUrl ? (
        <Image
          source={{ uri: primaryUrl }}
          style={styles.photo}
          onError={() => {
            setFailedUrls((current) => ({ ...current, [primaryUrl]: true }));
          }}
        />
      ) : null}
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
    gap: spacing.md,
  },
  member: {
    fontFamily: typography.sansSemibold,
    fontSize: 15,
    color: colors.textPrimary,
    flex: 1,
    minWidth: 0,
  },
  date: {
    fontFamily: typography.sans,
    fontSize: 12,
    color: colors.textTertiary,
    flexShrink: 0,
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
  photo: {
    width: "100%",
    height: 180,
    borderRadius: radii.md,
    backgroundColor: colors.bgInset,
  },
});
