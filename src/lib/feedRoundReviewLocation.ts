import { formatGolfCourseLocation } from "../types/golfCourse";

/** Matches find_or_create_member_golf_course_internal location length rules. */
export const FEED_ROUND_REVIEW_LOCATION_MIN_LENGTH = 2;
export const FEED_ROUND_REVIEW_LOCATION_MAX_LENGTH = 200;

export const FEED_ROUND_REVIEW_LOCATION_REQUIRED_MESSAGE =
  "Add a course location (city and region) before posting your round.";

export function isUsableRoundReviewLocation(location: string | null | undefined): boolean {
  const trimmed = (location ?? "").trim();
  return (
    trimmed.length >= FEED_ROUND_REVIEW_LOCATION_MIN_LENGTH &&
    trimmed.length <= FEED_ROUND_REVIEW_LOCATION_MAX_LENGTH
  );
}

export function locationFromSelectedGolfCourse(course: {
  city?: string | null;
  region?: string | null;
  country?: string | null;
}): string {
  return formatGolfCourseLocation(course).trim();
}

/**
 * Resolve the location written on Feed Round Review create.
 * Prefer a selected directory course's real location; otherwise use the
 * member-entered location. Never invent placeholders.
 */
export function resolveFeedRoundReviewLocation(input: {
  selectedCourseLocation?: string | null;
  manualLocation?: string | null;
}): { ok: true; location: string } | { ok: false; message: string } {
  const fromCourse = (input.selectedCourseLocation ?? "").trim();
  if (isUsableRoundReviewLocation(fromCourse)) {
    return { ok: true, location: fromCourse };
  }

  const manual = (input.manualLocation ?? "").trim();
  if (isUsableRoundReviewLocation(manual)) {
    return { ok: true, location: manual };
  }

  return { ok: false, message: FEED_ROUND_REVIEW_LOCATION_REQUIRED_MESSAGE };
}
