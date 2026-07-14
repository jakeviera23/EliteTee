import { formatGolfCourseLocation } from "../types/golfCourse";
import { fetchGolfCoursesByIds } from "./golfCourses";

export type BucketListCourseSummary = {
  id: string;
  name: string;
  location: string;
  slug: string;
};

export async function loadBucketListCourseSummaries(courseIds: string[]) {
  const normalizedIds = [...new Set(courseIds.map((id) => id.trim()).filter(Boolean))];
  if (normalizedIds.length === 0) {
    return { data: [] as BucketListCourseSummary[], error: null };
  }

  const { data, error } = await fetchGolfCoursesByIds(normalizedIds);
  if (error) {
    return { data: null, error };
  }

  const coursesById = new Map((data ?? []).map((course) => [course.id, course]));

  return {
    data: normalizedIds
      .map((id) => coursesById.get(id))
      .filter((course): course is NonNullable<typeof course> => Boolean(course))
      .map((course) => ({
        id: course.id,
        name: course.name,
        location: formatGolfCourseLocation(course) || "Location not available",
        slug: course.slug,
      })),
    error: null,
  };
}
