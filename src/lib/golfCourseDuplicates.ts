import type {
  GolfCourseDuplicateCandidate,
  GolfCourseDuplicateMatchReason,
} from "../types/golfCourseImport";

export type GolfCourseDuplicateMatchInput = {
  external_id?: string | null;
  name?: string | null;
  city?: string | null;
  country?: string | null;
};

export type GolfCourseDuplicateMatchRow = {
  id: string;
  external_id?: string | null;
  name: string;
  city?: string | null;
  country?: string | null;
  normalized_name?: string | null;
};

export function normalizeGolfCourseNameForMatch(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function normalizeLocationToken(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function rankDuplicateMatchReason(
  reason: GolfCourseDuplicateMatchReason,
): number {
  switch (reason) {
    case "external_id":
      return 1;
    case "normalized_name_city_country":
      return 2;
    case "normalized_name_country":
      return 3;
    default:
      return 99;
  }
}

export function findGolfCourseDuplicateCandidatesLocal(
  input: GolfCourseDuplicateMatchInput,
  existingCourses: GolfCourseDuplicateMatchRow[],
  options?: { excludeCourseId?: string | null },
): GolfCourseDuplicateCandidate[] {
  const externalId = input.external_id?.trim() || null;
  const normalizedName = normalizeGolfCourseNameForMatch(input.name);
  const cityKey = normalizeLocationToken(input.city) || null;
  const countryKey = normalizeLocationToken(input.country) || null;
  const excludeCourseId = options?.excludeCourseId?.trim() || null;

  const matches: GolfCourseDuplicateCandidate[] = [];

  for (const course of existingCourses) {
    if (excludeCourseId && course.id === excludeCourseId) continue;

    const courseNormalizedName =
      course.normalized_name?.trim() || normalizeGolfCourseNameForMatch(course.name);
    const courseCity = normalizeLocationToken(course.city);
    const courseCountry = normalizeLocationToken(course.country);

    if (externalId && course.external_id?.trim() === externalId) {
      matches.push({
        golf_course_id: course.id,
        match_reason: "external_id",
        match_rank: 1,
      });
      continue;
    }

    if (!normalizedName || !countryKey) continue;
    if (courseNormalizedName !== normalizedName) continue;
    if (courseCountry !== countryKey) continue;

    if (cityKey && courseCity === cityKey) {
      matches.push({
        golf_course_id: course.id,
        match_reason: "normalized_name_city_country",
        match_rank: 2,
      });
      continue;
    }

    matches.push({
      golf_course_id: course.id,
      match_reason: "normalized_name_country",
      match_rank: 3,
    });
  }

  return matches.sort(
    (a, b) => a.match_rank - b.match_rank || a.golf_course_id.localeCompare(b.golf_course_id),
  );
}
