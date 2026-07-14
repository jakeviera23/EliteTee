import type { RetrievedCourse } from "./types.ts";
import { normalizeCourseLocationQuery } from "./course-location.ts";

export type CourseDirectoryFilters = {
  locationQuery: string;
  accessType: string | null;
  courseType: string | null;
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

function formatCourseLine(course: RetrievedCourse): string {
  const details = [course.city, course.access_type, course.course_type].filter(Boolean);
  const suffix = details.length > 0 ? ` (${details.join(" · ")})` : "";
  return `${course.name}${suffix}`;
}

export function buildCourseDirectoryAnswer(
  courses: RetrievedCourse[],
  filters: CourseDirectoryFilters,
): string {
  if (courses.length === 0) return "";

  const locationLabel = filters.locationQuery ? formatLocationLabel(filters.locationQuery) : "";
  const hasReviewData = courses.some(
    (course) => (course.round_count ?? 0) > 0 || (course.avg_rating ?? 0) > 0,
  );

  let intro = `EliteTee currently has ${courses.length} course${courses.length === 1 ? "" : "s"}`;
  if (locationLabel) {
    intro += ` in ${locationLabel}`;
  }
  intro += ".";

  if (!hasReviewData) {
    intro += " Member review data is still limited.";
  }

  const lines = courses.slice(0, 8).map((course) => `- ${formatCourseLine(course)}`);

  return `${intro}\n\n${lines.join("\n")}`;
}

export function buildNoCourseDirectoryResultsAnswer(locationQuery: string): string {
  const locationLabel = locationQuery ? formatLocationLabel(locationQuery) : "";
  if (locationLabel) {
    return `EliteTee does not currently list any courses in ${locationLabel}.`;
  }
  return "EliteTee does not currently list any courses matching that search.";
}
