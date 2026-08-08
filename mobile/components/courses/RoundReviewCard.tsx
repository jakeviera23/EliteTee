import { Image, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { formatCourseRatingDisplay } from "@/lib/courseRating";
import { formatPlayedOnDate } from "@/lib/api/courseRounds";
import type { MobileCourseRoundRecord } from "@/types/courseRoundPhoto";
import { isMeaningfulDisplayValue } from "@/lib/display";

type RoundReviewCardProps = {
  round: MobileCourseRoundRecord;
};

export function RoundReviewCard({ round }: RoundReviewCardProps) {
  const ratingDisplay = formatCourseRatingDisplay(round.course_rating);
  const coverPhoto = round.photos?.[0];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.member}>{round.member_name ?? "Member"}</Text>
        <Text style={styles.date}>{formatPlayedOnDate(round.played_on)}</Text>
      </View>
      {ratingDisplay ? <Text style={styles.rating}>{ratingDisplay}/10</Text> : null}
      {isMeaningfulDisplayValue(round.note) ? (
        <Text style={styles.note}>{round.note}</Text>
      ) : null}
      {coverPhoto?.signed_url ? (
        <Image source={{ uri: coverPhoto.signed_url }} style={styles.photo} />
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
  },
  date: {
    fontFamily: typography.sans,
    fontSize: 12,
    color: colors.textTertiary,
  },
  rating: {
    fontFamily: typography.sansMedium,
    fontSize: 13,
    color: colors.gold,
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
    backgroundColor: colors.bgSurface,
  },
});
