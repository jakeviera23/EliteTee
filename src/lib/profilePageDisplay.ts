import { formatCourseRatingDisplay } from "./courseRating";
import { formatPlayedOnDate } from "./memberCourseRounds";
import type { MemberCourseRoundRecord } from "../types/memberCourseRound";

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
  rounds: MemberCourseRoundRecord[],
): ProfileCoursePlayedSummary[] {
  const byKey = new Map<string, MemberCourseRoundRecord[]>();

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
  rounds: MemberCourseRoundRecord[],
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

export const PROFILE_EXPERIENCE_NOTE_PREVIEW_LENGTH = 180;
export const PROFILE_EXPERIENCE_NOTE_MAX_LINES = 3;
export const PROFILE_RECENT_EXPERIENCE_LIMIT = 4;
export const PROFILE_FEED_ACTIVITY_LIMIT = 4;
export const PROFILE_FEED_EXCERPT_LENGTH = 140;

export function shouldTruncateProfileExperienceNote(
  note: string,
  maxLength = PROFILE_EXPERIENCE_NOTE_PREVIEW_LENGTH,
  maxLines = PROFILE_EXPERIENCE_NOTE_MAX_LINES,
) {
  const trimmed = note.trim();
  if (!trimmed) return false;
  return trimmed.length > maxLength || trimmed.split("\n").length > maxLines;
}

export function truncateProfileExperienceNote(
  note: string,
  maxLength = PROFILE_EXPERIENCE_NOTE_PREVIEW_LENGTH,
) {
  const trimmed = note.trim();
  if (!trimmed) {
    return { preview: "", isTruncated: false };
  }

  const isTruncated = shouldTruncateProfileExperienceNote(trimmed, maxLength);
  if (!isTruncated) {
    return { preview: trimmed, isTruncated: false };
  }

  return {
    preview: `${trimmed.slice(0, maxLength).trimEnd()}…`,
    isTruncated: true,
  };
}

export function truncateProfileFeedExcerpt(
  text: string,
  maxLength = PROFILE_FEED_EXCERPT_LENGTH,
) {
  const trimmed = text.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength).trimEnd()}…`;
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
