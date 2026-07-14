import type { GolfCourseSearchResult } from "../types/golfCourse";

export function appendUniqueCourses(
  current: GolfCourseSearchResult[],
  next: GolfCourseSearchResult[],
): GolfCourseSearchResult[] {
  if (current.length === 0) return [...next];
  if (next.length === 0) return [...current];

  const seen = new Set(current.map((course) => course.id));
  const additions = next.filter((course) => !seen.has(course.id));
  return additions.length > 0 ? [...current, ...additions] : [...current];
}

