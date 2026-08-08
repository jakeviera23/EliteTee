import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { formatCourseRatingDisplay } from "@/lib/courseRating";
import { formatGolfCourseLocation, type MobileGolfCourse } from "@/types/course";
import { isMeaningfulDisplayValue } from "@/lib/display";

type CourseCardProps = {
  course: MobileGolfCourse;
  onPress?: () => void;
};

export function CourseCard({ course, onPress }: CourseCardProps) {
  const location = formatGolfCourseLocation(course);
  const ratingDisplay = formatCourseRatingDisplay(course.avg_rating ?? null);
  const metaParts = [
    isMeaningfulDisplayValue(course.course_type) ? course.course_type : null,
    isMeaningfulDisplayValue(course.access_type) ? course.access_type : null,
  ].filter(Boolean);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <View style={styles.row}>
        {course.thumbnail_url || course.image_url ? (
          <Image
            source={{ uri: course.thumbnail_url ?? course.image_url ?? undefined }}
            style={styles.thumb}
          />
        ) : (
          <View style={styles.thumbFallback}>
            <Text style={styles.thumbInitial}>{course.name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={2}>
            {course.name}
          </Text>
          {location ? (
            <Text style={styles.meta} numberOfLines={1}>
              {location}
            </Text>
          ) : null}
          {metaParts.length > 0 ? (
            <Text style={styles.detail} numberOfLines={1}>
              {metaParts.join(" · ")}
            </Text>
          ) : null}
          <View style={styles.statsRow}>
            {ratingDisplay ? (
              <Text style={styles.rating}>{ratingDisplay}/10</Text>
            ) : null}
            {(course.member_count ?? 0) > 0 ? (
              <Text style={styles.stat}>
                {course.member_count} experience{course.member_count === 1 ? "" : "s"}
              </Text>
            ) : null}
            {(course.round_count ?? 0) > 0 ? (
              <Text style={styles.stat}>
                {course.round_count} round{course.round_count === 1 ? "" : "s"}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    padding: spacing.md,
  },
  pressed: {
    opacity: 0.92,
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radii.md,
    backgroundColor: colors.bgSurface,
  },
  thumbFallback: {
    width: 64,
    height: 64,
    borderRadius: radii.md,
    backgroundColor: colors.forestSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.forestBorder,
  },
  thumbInitial: {
    fontFamily: typography.serif,
    fontSize: 24,
    color: colors.gold,
  },
  body: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontFamily: typography.sansSemibold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  meta: {
    fontFamily: typography.sans,
    fontSize: 13,
    color: colors.textSecondary,
  },
  detail: {
    fontFamily: typography.sans,
    fontSize: 12,
    color: colors.textTertiary,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: 2,
  },
  rating: {
    fontFamily: typography.sansMedium,
    fontSize: 12,
    color: colors.gold,
  },
  stat: {
    fontFamily: typography.sans,
    fontSize: 12,
    color: colors.textTertiary,
  },
});
