import { formatCourseRatingDisplay } from "./courseRating";
import { formatPlayedOnDate } from "./api/courseRounds";
import type { MobileCourseRoundRecord } from "@/types/courseRoundPhoto";

export type ProfileCoursePlayedSummary = {
  key: string;
  courseName: string;
  courseSlug?: string;
  golfCourseId?: string | null;
  roundCount: number;
  latestPlayedOn: string;
  avgRating: number | null;
};

export type ProfileExperienceStats = {
  roundsShared: number;
  coursesPlayed: number;
  feedPosts: number;
  connections: number;
};

export function buildUniqueCoursesPlayed(
  rounds: MobileCourseRoundRecord[],
): ProfileCoursePlayedSummary[] {
  const byKey = new Map<string, MobileCourseRoundRecord[]>();

  for (const round of rounds) {
    const key =
      round.golf_course_id?.trim() ||
      round.course_name.trim().toLowerCase() ||
      round.id;
    const existing = byKey.get(key) ?? [];
    existing.push(round);
    byKey.set(key, existing);
  }

  return [...byKey.entries()]
    .map(([key, memberRounds]) => {
      const sorted = [...memberRounds].sort((a, b) => b.played_on.localeCompare(a.played_on));
      const latest = sorted[0]!;
      const ratings = sorted.map((round) => round.course_rating).filter(Number.isFinite);
      const avgRating =
        ratings.length > 0
          ? Math.round((ratings.reduce((sum, value) => sum + value, 0) / ratings.length) * 10) /
            10
          : null;

      return {
        key,
        courseName: latest.course_name.trim() || "Course",
        courseSlug: latest.course_slug,
        golfCourseId: latest.golf_course_id,
        roundCount: sorted.length,
        latestPlayedOn: latest.played_on,
        avgRating,
      };
    })
    .sort((a, b) => b.latestPlayedOn.localeCompare(a.latestPlayedOn));
}

export function buildProfileExperienceStats(
  rounds: MobileCourseRoundRecord[],
  feedPostCount: number,
  connections = 0,
): ProfileExperienceStats {
  return {
    roundsShared: rounds.length,
    coursesPlayed: buildUniqueCoursesPlayed(rounds).length,
    feedPosts: feedPostCount,
    connections,
  };
}

export function formatProfileCoursePlayedMeta(summary: ProfileCoursePlayedSummary): string {
  const parts = [`Played ${formatPlayedOnDate(summary.latestPlayedOn)}`];
  if (summary.roundCount > 1) {
    parts.push(`${summary.roundCount} rounds`);
  }
  const rating = summary.avgRating !== null ? formatCourseRatingDisplay(summary.avgRating) : null;
  if (rating) {
    parts.push(`${rating} avg`);
  }
  return parts.join(" · ");
}
