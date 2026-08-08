export const COURSE_RATING_MIN = 1;
export const COURSE_RATING_MAX = 10;
export const COURSE_RATING_STEP = 0.1;

export type CourseRatingValidationResult =
  | { ok: true; value: number }
  | { ok: false; message: string };

export function normalizeCourseRating(value: number): number {
  return Math.round(value * 10) / 10;
}

export function validateCourseRating(value: unknown): CourseRatingValidationResult {
  if (value === null || value === undefined || value === "") {
    return { ok: false, message: "Please enter a rating from 1.0 to 10.0." };
  }

  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return { ok: false, message: "Please enter a valid rating." };
  }

  if (numeric < COURSE_RATING_MIN || numeric > COURSE_RATING_MAX) {
    return { ok: false, message: "Rating must be between 1.0 and 10.0." };
  }

  const normalized = normalizeCourseRating(numeric);
  if (normalized < COURSE_RATING_MIN || normalized > COURSE_RATING_MAX) {
    return { ok: false, message: "Rating must be between 1.0 and 10.0." };
  }

  return { ok: true, value: normalized };
}

export function formatCourseRatingDisplay(rating: number | null | undefined): string | null {
  if (rating === null || rating === undefined) return null;
  const result = validateCourseRating(rating);
  if (!result.ok) return null;
  return result.value.toFixed(1);
}

export function formatMemberRatingSummary(avgRating: number, reviewCount: number) {
  const display = formatCourseRatingDisplay(avgRating);
  if (!display) {
    return { score: "", detail: "" };
  }

  const reviewLabel = reviewCount === 1 ? "member review" : "member reviews";
  return {
    score: `${display} / ${COURSE_RATING_MAX.toFixed(1)}`,
    detail: `Based on ${reviewCount} ${reviewLabel}`,
  };
}
