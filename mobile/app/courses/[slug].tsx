import { useCallback, useEffect, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { RoundReviewCard } from "@/components/courses/RoundReviewCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Screen } from "@/components/ui/Screen";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { useAuth } from "@/hooks/AuthProvider";
import { fetchGolfCourseBySlug } from "@/lib/api/courses";
import { fetchMemberCourseRoundsForCourse } from "@/lib/api/courseRounds";
import { formatMemberRatingSummary } from "@/lib/courseRating";
import { isMeaningfulDisplayValue } from "@/lib/display";
import { formatMobileError } from "@/lib/errors";
import { formatGolfCourseLocation, type MobileGolfCourse } from "@/types/course";
import type { MobileCourseRoundRecord } from "@/types/courseRoundPhoto";

export default function CourseDetailScreen() {
  const router = useRouter();
  const { status } = useAuth();
  const { slug, highlightRoundId } = useLocalSearchParams<{
    slug: string;
    highlightRoundId?: string;
  }>();
  const normalizedSlug = typeof slug === "string" ? slug.trim() : "";
  const focusRoundId = typeof highlightRoundId === "string" ? highlightRoundId.trim() : "";

  const [course, setCourse] = useState<MobileGolfCourse | null>(null);
  const [rounds, setRounds] = useState<MobileCourseRoundRecord[]>([]);
  const [courseLoading, setCourseLoading] = useState(true);
  const [roundsLoading, setRoundsLoading] = useState(false);
  const [courseError, setCourseError] = useState<string | null>(null);
  const [roundsError, setRoundsError] = useState<string | null>(null);
  const requestId = useRef(0);

  const loadRounds = useCallback(async (golfCourseId: string, currentRequest: number) => {
    setRoundsLoading(true);
    setRoundsError(null);

    const { data: roundData, error: nextRoundsError } = await fetchMemberCourseRoundsForCourse({
      golfCourseId,
    });

    if (currentRequest !== requestId.current) return;

    setRounds(roundData);
    setRoundsError(nextRoundsError ? formatMobileError(nextRoundsError.message) : null);
    setRoundsLoading(false);
  }, []);

  const loadCourse = useCallback(async () => {
    if (!normalizedSlug) return;
    // Rounds require an authenticated portal session (RLS). Wait for auth boot.
    if (status === "booting") return;

    const currentRequest = ++requestId.current;
    setCourseLoading(true);
    setCourseError(null);
    setRoundsError(null);

    const { data: courseData, error: nextCourseError } = await fetchGolfCourseBySlug(normalizedSlug);
    if (currentRequest !== requestId.current) return;

    if (nextCourseError) {
      setCourse(null);
      setRounds([]);
      setCourseError(formatMobileError(nextCourseError.message));
      setCourseLoading(false);
      setRoundsLoading(false);
      return;
    }

    if (!courseData) {
      setCourse(null);
      setRounds([]);
      setCourseError(null);
      setCourseLoading(false);
      setRoundsLoading(false);
      return;
    }

    setCourse(courseData);
    setCourseLoading(false);

    if (status !== "ready") {
      setRounds([]);
      setRoundsLoading(false);
      setRoundsError("Sign in with portal access to view member experiences.");
      return;
    }

    await loadRounds(courseData.id, currentRequest);
  }, [normalizedSlug, status, loadRounds]);

  useEffect(() => {
    void loadCourse();
  }, [loadCourse]);

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

  const orderedRounds =
    focusRoundId && rounds.some((round) => round.id === focusRoundId)
      ? [
          ...rounds.filter((round) => round.id === focusRoundId),
          ...rounds.filter((round) => round.id !== focusRoundId),
        ]
      : rounds;

  return (
    <Screen title={course?.name ?? "Course"} subtitle="Course detail from the EliteTee directory.">
      <Button label="Back" variant="ghost" onPress={() => router.back()} />

      {courseLoading || status === "booting" ? (
        <LoadingState label="Loading course…" />
      ) : null}

      {!courseLoading && courseError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{courseError}</Text>
          <Pressable onPress={() => void loadCourse()}>
            <Text style={styles.retry}>Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {!courseLoading && !courseError && !course ? (
        <EmptyState title="Course not found" body="This course may have been removed or renamed." />
      ) : null}

      {!courseLoading && !courseError && course ? (
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

          {roundsLoading ? <LoadingState label="Loading member experiences…" /> : null}

          {!roundsLoading && roundsError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{roundsError}</Text>
              <Pressable onPress={() => void loadRounds(course.id, ++requestId.current)}>
                <Text style={styles.retry}>Try again</Text>
              </Pressable>
            </View>
          ) : null}

          {!roundsLoading && !roundsError && orderedRounds.length === 0 ? (
            <EmptyState
              title="No member experiences yet"
              body="Round reviews appear here as members share experiences at this course."
            />
          ) : null}

          {!roundsLoading && !roundsError
            ? orderedRounds.map((round) => (
                <View
                  key={round.id}
                  style={round.id === focusRoundId ? styles.highlightedRound : null}
                >
                  <RoundReviewCard round={round} />
                </View>
              ))
            : null}
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
  highlightedRound: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.gold,
    padding: 2,
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
  retry: {
    fontFamily: typography.sansMedium,
    fontSize: 14,
    color: colors.gold,
  },
});
