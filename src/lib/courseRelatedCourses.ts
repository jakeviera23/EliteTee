import type { GolfCourseRecord, GolfCourseSearchResult } from "../types/golfCourse";
import { searchGolfCourses } from "./golfCourses";

function normalizeMatchValue(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

export function scoreRelatedCourse(
  current: Pick<
    GolfCourseRecord,
    "id" | "country" | "region" | "course_type" | "access_type" | "avg_rating"
  >,
  candidate: GolfCourseSearchResult,
): number {
  if (candidate.id === current.id) return -1;

  let categoryScore = 0;
  const currentCountry = normalizeMatchValue(current.country);
  const currentRegion = normalizeMatchValue(current.region);
  const currentType = normalizeMatchValue(current.course_type);
  const currentAccess = normalizeMatchValue(current.access_type);

  if (currentCountry && currentCountry === normalizeMatchValue(candidate.country)) {
    categoryScore += 4;
  }
  if (currentRegion && currentRegion === normalizeMatchValue(candidate.region)) {
    categoryScore += 3;
  }
  if (currentType && currentType === normalizeMatchValue(candidate.course_type)) {
    categoryScore += 2;
  }
  if (currentAccess && currentAccess === normalizeMatchValue(candidate.access_type)) {
    categoryScore += 2;
  }

  if (categoryScore <= 0) return -1;

  let score = categoryScore;

  if (current.avg_rating !== null && current.avg_rating !== undefined && candidate.avg_rating != null) {
    const diff = Math.abs(current.avg_rating - candidate.avg_rating);
    if (diff <= 1) score += 2;
    else if (diff <= 2) score += 1;
  }

  if ((candidate.round_count ?? 0) > 0) {
    score += 0.1;
  }

  return score;
}

export function pickRelatedCourses(
  current: Pick<
    GolfCourseRecord,
    "id" | "country" | "region" | "course_type" | "access_type" | "avg_rating"
  >,
  pool: GolfCourseSearchResult[],
  limit = 6,
): GolfCourseSearchResult[] {
  return pool
    .map((candidate) => ({ candidate, score: scoreRelatedCourse(current, candidate) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const roundDiff = (b.candidate.round_count ?? 0) - (a.candidate.round_count ?? 0);
      if (roundDiff !== 0) return roundDiff;
      return a.candidate.name.localeCompare(b.candidate.name);
    })
    .slice(0, limit)
    .map((entry) => entry.candidate);
}

export async function fetchRelatedCourses(current: GolfCourseRecord, limit = 6) {
  const poolById = new Map<string, GolfCourseSearchResult>();
  const queries = [current.country?.trim(), current.region?.trim()].filter(Boolean) as string[];

  const { data: baseline } = await searchGolfCourses({ query: "", limit: 60, offset: 0 });
  for (const course of baseline ?? []) {
    poolById.set(course.id, course);
  }

  for (const query of queries.slice(0, 2)) {
    const { data } = await searchGolfCourses({ query, limit: 40, offset: 0 });
    for (const course of data ?? []) {
      poolById.set(course.id, course);
    }
  }

  return pickRelatedCourses(current, [...poolById.values()], limit);
}
