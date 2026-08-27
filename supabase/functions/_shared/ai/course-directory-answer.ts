import type { RetrievedCourse } from "./types.ts";
import { normalizeCourseLocationQuery } from "./course-location.ts";

export type CourseDirectoryFilters = {
  locationQuery: string;
  accessType: string | null;
  courseType: string | null;
  /** When true, answer using aggregated review ratings; empty location is allowed. */
  rankByReviews?: boolean;
};

export function filterCoursesByDirectoryFilters(
  courses: RetrievedCourse[],
  filters: CourseDirectoryFilters,
): RetrievedCourse[] {
  return courses.filter((course) => {
    if (filters.accessType) {
      const access = course.access_type?.toLowerCase() ?? "";
      if (!access.includes(filters.accessType.toLowerCase())) return false;
    }
    if (filters.courseType) {
      const courseType = course.course_type?.toLowerCase() ?? "";
      if (!courseType.includes(filters.courseType.toLowerCase())) return false;
    }
    return true;
  });
}

function formatLocationLabel(locationQuery: string): string {
  return normalizeCourseLocationQuery(locationQuery);
}

function formatCourseLine(course: RetrievedCourse, includeRatings: boolean): string {
  const details = [course.city, course.access_type, course.course_type].filter(Boolean);
  const suffix = details.length > 0 ? ` (${details.join(" · ")})` : "";
  let line = `${course.name}${suffix}`;
  if (includeRatings) {
    const bits: string[] = [];
    if (typeof course.avg_rating === "number" && Number.isFinite(course.avg_rating)) {
      bits.push(`avg rating ${course.avg_rating}`);
    }
    if (typeof course.round_count === "number" && course.round_count > 0) {
      bits.push(`${course.round_count} round${course.round_count === 1 ? "" : "s"}`);
    }
    if (typeof course.recommend_pct === "number" && Number.isFinite(course.recommend_pct)) {
      bits.push(`${course.recommend_pct}% would play again`);
    }
    if (bits.length > 0) line += ` — ${bits.join(", ")}`;
  }
  return line;
}

export function buildCourseDirectoryAnswer(
  courses: RetrievedCourse[],
  filters: CourseDirectoryFilters,
): string {
  if (courses.length === 0) return "";

  const locationLabel = filters.locationQuery ? formatLocationLabel(filters.locationQuery) : "";
  const rankByReviews = Boolean(filters.rankByReviews);
  const reviewed = courses.filter(
    (course) => (course.round_count ?? 0) > 0 || (course.avg_rating ?? 0) > 0,
  );

  if (rankByReviews) {
    if (reviewed.length === 0) {
      return "EliteTee does not yet have enough member review ratings to rank courses.";
    }

    const ranked = [...reviewed].sort((left, right) => {
      const leftRating = left.avg_rating ?? 0;
      const rightRating = right.avg_rating ?? 0;
      if (rightRating !== leftRating) return rightRating - leftRating;
      return (right.round_count ?? 0) - (left.round_count ?? 0);
    });

    let intro = `Based on EliteTee member reviews, here are the top-rated courses`;
    if (locationLabel) intro += ` in ${locationLabel}`;
    intro += ":";
    if (reviewed.length < 3) {
      intro += " Member review data is still limited.";
    }

    const lines = ranked.slice(0, 8).map((course) => `- ${formatCourseLine(course, true)}`);
    return `${intro}\n\n${lines.join("\n")}`;
  }

  const hasReviewData = reviewed.length > 0;

  let intro = `EliteTee currently has ${courses.length} course${courses.length === 1 ? "" : "s"}`;
  if (locationLabel) {
    intro += ` in ${locationLabel}`;
  }
  intro += ".";

  if (!hasReviewData) {
    intro += " Member review data is still limited.";
  }

  const lines = courses.slice(0, 8).map((course) => `- ${formatCourseLine(course, false)}`);

  return `${intro}\n\n${lines.join("\n")}`;
}

export function buildNoCourseDirectoryResultsAnswer(locationQuery: string): string {
  const locationLabel = locationQuery ? formatLocationLabel(locationQuery) : "";
  if (locationLabel) {
    return `EliteTee does not currently list any courses in ${locationLabel}.`;
  }
  return "EliteTee does not currently list any courses matching that search.";
}
