export const COURSE_RATING_MAX = 10;

export function formatCourseRatingValue(rating: number) {
  return `${rating}/${COURSE_RATING_MAX}`;
}

export function formatCourseRatingStars(rating: number) {
  const safeRating = Math.max(1, Math.min(COURSE_RATING_MAX, Math.round(rating)));
  return "★".repeat(safeRating) + "☆".repeat(COURSE_RATING_MAX - safeRating);
}

export function formatMemberRatingSummary(avgRating: number, reviewCount: number) {
  const formattedAvg = Number.isInteger(avgRating) ? String(avgRating) : avgRating.toFixed(1);
  const reviewLabel = reviewCount === 1 ? "member review" : "member reviews";
  return {
    score: `${formattedAvg} / ${COURSE_RATING_MAX}`,
    detail: `Based on ${reviewCount} ${reviewLabel}`,
  };
}
