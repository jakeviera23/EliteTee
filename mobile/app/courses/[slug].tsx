import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { RoundReviewCard } from "@/components/courses/RoundReviewCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Screen } from "@/components/ui/Screen";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { fetchGolfCourseBySlug } from "@/lib/api/courses";
import { fetchMemberCourseRoundsForCourse } from "@/lib/api/courseRounds";
import { formatMemberRatingSummary } from "@/lib/courseRating";
import { isMeaningfulDisplayValue } from "@/lib/display";
import { formatMobileError } from "@/lib/errors";
import { formatGolfCourseLocation, type MobileGolfCourse } from "@/types/course";
import type { MobileCourseRoundRecord } from "@/types/courseRoundPhoto";

export default function CourseDetailScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [course, setCourse] = useState<MobileGolfCourse | null>(null);
  const [rounds, setRounds] = useState<MobileCourseRoundRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    let active = true;

    void (async () => {
      setLoading(true);
      setError(null);

      const { data: courseData, error: courseError } = await fetchGolfCourseBySlug(slug);
      if (!active) return;

      if (courseError) {
        setError(formatMobileError(courseError.message));
        setLoading(false);
        return;
      }

      if (!courseData) {
        setCourse(null);
        setRounds([]);
        setLoading(false);
        return;
      }

      setCourse(courseData);

      const { data: roundData, error: roundsError } = await fetchMemberCourseRoundsForCourse({
        golfCourseId: courseData.id,
      });

      if (!active) return;

      setRounds(roundData);
      if (roundsError) {
        setError(formatMobileError(roundsError.message));
      }
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [slug]);

  const ratingSummary = course
    ? formatMemberRatingSummary(course.avg_rating ?? 0, course.round_count ?? rounds.length)
    : { score: "", detail: "" };

  const metaParts = [
    isMeaningfulDisplayValue(course?.course_type) ? course?.course_type : null,
    isMeaningfulDisplayValue(course?.access_type) ? course?.access_type : null,
    course?.holes ? `${course.holes} holes` : null,
  ].filter(Boolean);

  const architectLine = [
    isMeaningfulDisplayValue(course?.architect) ? course?.architect : null,
    course?.year_opened ? String(course.year_opened) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Screen title={course?.name ?? "Course"} subtitle="Course detail from the EliteTee directory.">
      <Button label="Back" variant="ghost" onPress={() => router.back()} />

      {loading ? <LoadingState label="Loading course…" /> : null}

      {!loading && error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {!loading && !error && !course ? (
        <EmptyState title="Course not found" body="This course may have been removed or renamed." />
      ) : null}

      {!loading && !error && course ? (
        <>
          {course.image_url ? (
            <Image source={{ uri: course.image_url }} style={styles.hero} />
          ) : null}

          <View style={styles.card}>
            <Text style={styles.location}>{formatGolfCourseLocation(course)}</Text>
            {metaParts.length > 0 ? <Text style={styles.meta}>{metaParts.join(" · ")}</Text> : null}
            {architectLine ? <Text style={styles.meta}>{architectLine}</Text> : null}
            {ratingSummary.score ? (
              <View style={styles.ratingBlock}>
                <Text style={styles.ratingScore}>{ratingSummary.score}</Text>
                {ratingSummary.detail ? (
                  <Text style={styles.ratingDetail}>{ratingSummary.detail}</Text>
                ) : null}
              </View>
            ) : null}
            {isMeaningfulDisplayValue(course.description) ? (
              <Text style={styles.description}>{course.description}</Text>
            ) : null}
          </View>

          <Text style={styles.sectionTitle}>Member experiences</Text>
          {rounds.length === 0 ? (
            <EmptyState
              title="No member experiences yet"
              body="Round reviews appear here as members share experiences at this course."
            />
          ) : (
            rounds.map((round) => <RoundReviewCard key={round.id} round={round} />)
          )}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    width: "100%",
    height: 200,
    borderRadius: radii.lg,
    backgroundColor: colors.bgSurface,
  },
  card: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    gap: spacing.sm,
  },
  location: {
    fontFamily: typography.sans,
    fontSize: 14,
    color: colors.textSecondary,
  },
  meta: {
    fontFamily: typography.sans,
    fontSize: 13,
    color: colors.textTertiary,
  },
  ratingBlock: {
    marginTop: spacing.xs,
    gap: 2,
  },
  ratingScore: {
    fontFamily: typography.sansSemibold,
    fontSize: 16,
    color: colors.gold,
  },
  ratingDetail: {
    fontFamily: typography.sans,
    fontSize: 12,
    color: colors.textTertiary,
  },
  description: {
    marginTop: spacing.sm,
    fontFamily: typography.sans,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  sectionTitle: {
    fontFamily: typography.sansSemibold,
    fontSize: 18,
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
});
