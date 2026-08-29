import { UNSPECIFIED_COUNTRY, UNSPECIFIED_REGION } from "./courseDirectory";
import { normalizeRegionLabel } from "./courseLocationNormalization";
import { formatCourseRatingDisplay } from "./courseRating";
import { isMeaningfulProfileText } from "./portalProfileDisplay";
import type { GolfCourseRecord } from "../types/golfCourse";

const COURSE_PLACEHOLDER_VALUES = new Set([
  "country not specified",
  "region not specified",
  "location not set",
  "location not available",
  "location not shared",
  "other",
]);

export const CURATED_DESTINATION_PREVIEW_COUNT = 8;

export function isMeaningfulCourseText(value: unknown): boolean {
  if (!isMeaningfulProfileText(value)) return false;

  const text = String(value).trim().toLowerCase();
  return !COURSE_PLACEHOLDER_VALUES.has(text);
}

export function getMeaningfulCourseText(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  const text = String(value).trim();
  if (!text || !isMeaningfulCourseText(text)) return null;

  return text;
}

export function formatPlayedRoundReviewMeta(
  playedOnLabel: string,
  location: unknown,
): string {
  const meaningfulLocation = getMeaningfulCourseText(location);
  return meaningfulLocation
    ? `Played ${playedOnLabel} · ${meaningfulLocation}`
    : `Played ${playedOnLabel}`;
}

export function isMeaningfulBrowseCountry(country: string): boolean {
  return isMeaningfulCourseText(country) && country !== UNSPECIFIED_COUNTRY;
}

export function isMeaningfulBrowseRegion(region: string): boolean {
  return isMeaningfulCourseText(region) && region !== UNSPECIFIED_REGION;
}

export function formatCourseDisplayLocation(
  course: Pick<GolfCourseRecord, "city" | "region" | "country">,
): string | null {
  const normalizedRegion =
    normalizeRegionLabel(course.country, course.region) || course.region?.trim() || "";
  const parts = [course.city, normalizedRegion, course.country]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value) && isMeaningfulCourseText(value));

  return parts.length > 0 ? parts.join(", ") : null;
}

export function hasCourseMemberActivity(
  roundCount: number,
  memberCount: number,
): boolean {
  return roundCount > 0 || memberCount > 0;
}

export function formatCourseRecommendLabel(
  value: number | null | undefined,
  roundCount: number,
): string | null {
  if (roundCount === 0 || value === null || value === undefined) {
    return null;
  }
  return `${Math.round(value)}% would play again`;
}

export function formatCourseCountLabel(
  value: number,
  singular: string,
  plural: string,
): string | null {
  if (value <= 0) return null;
  return `${value} ${value === 1 ? singular : plural}`;
}

export function buildCourseCardActivitySummary(params: {
  avgRating: number | null | undefined;
  roundCount: number;
  memberCount: number;
  recommendPct: number | null | undefined;
}): string[] {
  const { avgRating, roundCount, memberCount, recommendPct } = params;

  if (!hasCourseMemberActivity(roundCount, memberCount)) {
    return [];
  }

  const lines: string[] = [];

  if (avgRating !== null && avgRating !== undefined && roundCount > 0) {
    const ratingLabel = formatCourseRatingDisplay(avgRating);
    if (ratingLabel) {
      lines.push(ratingLabel);
    }
  }

  const experienceCount = roundCount > 0 ? roundCount : memberCount;
  lines.push(
    `${experienceCount} member ${experienceCount === 1 ? "experience" : "experiences"}`,
  );

  const recommendLabel = formatCourseRecommendLabel(recommendPct, roundCount);
  if (recommendLabel) {
    lines.push(recommendLabel);
  }

  return lines;
}

export function buildCourseClassificationPills(
  course: Pick<GolfCourseRecord, "course_type" | "access_type">,
): string[] {
  const pills: string[] = [];

  const courseType = course.course_type?.trim();
  if (courseType && isMeaningfulCourseText(courseType)) {
    pills.push(courseType);
  }

  const accessType = course.access_type?.trim();
  if (accessType && isMeaningfulCourseText(accessType)) {
    pills.push(accessType);
  }

  return pills;
}

export type CourseLocationClassificationFact = {
  label: string;
  value: string;
};

export function buildCourseLocationClassificationFacts(
  course: Pick<GolfCourseRecord, "city" | "region" | "country" | "course_type" | "access_type">,
): CourseLocationClassificationFact[] {
  const facts: CourseLocationClassificationFact[] = [];

  const city = course.city?.trim();
  if (city && isMeaningfulCourseText(city)) {
    facts.push({ label: "City", value: city });
  }

  const region =
    normalizeRegionLabel(course.country, course.region) || course.region?.trim() || "";
  if (region && isMeaningfulCourseText(region)) {
    facts.push({ label: "Region", value: region });
  }

  const country = course.country?.trim();
  if (country && isMeaningfulCourseText(country)) {
    facts.push({ label: "Country", value: country });
  }

  const courseType = course.course_type?.trim();
  if (courseType && isMeaningfulCourseText(courseType)) {
    facts.push({ label: "Course type", value: courseType });
  }

  const accessType = course.access_type?.trim();
  if (accessType && isMeaningfulCourseText(accessType)) {
    facts.push({ label: "Access", value: accessType });
  }

  return facts;
}

export function splitDestinationsForPreview<T extends { courseCount: number }>(
  destinations: T[],
  previewCount = CURATED_DESTINATION_PREVIEW_COUNT,
): { preview: T[]; hasMore: boolean } {
  const sorted = [...destinations].sort((a, b) => {
    if (b.courseCount !== a.courseCount) {
      return b.courseCount - a.courseCount;
    }
    return 0;
  });

  if (sorted.length <= previewCount) {
    return { preview: sorted, hasMore: false };
  }

  return {
    preview: sorted.slice(0, previewCount),
    hasMore: true,
  };
}
