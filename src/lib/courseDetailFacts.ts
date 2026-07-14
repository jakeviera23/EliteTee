import type { GolfCourseRecord } from "../types/golfCourse";

export type CourseDetailFact = {
  label: string;
  value: string;
};

export function formatCourseYardage(yardage: number | null | undefined): string | null {
  if (yardage === null || yardage === undefined || !Number.isFinite(yardage) || yardage <= 0) {
    return null;
  }
  return `${Math.round(yardage).toLocaleString()} yards`;
}

export function formatArchitectYearLine(
  architect: string | null | undefined,
  yearOpened: number | null | undefined,
): string | null {
  const architectLabel = architect?.trim() || null;
  const yearLabel =
    yearOpened !== null && yearOpened !== undefined && Number.isFinite(yearOpened)
      ? String(yearOpened)
      : null;

  if (architectLabel && yearLabel) return `${architectLabel} • ${yearLabel}`;
  return architectLabel ?? yearLabel;
}

export function buildCourseDetailFacts(
  course: Pick<
    GolfCourseRecord,
    "architect" | "year_opened" | "holes" | "par" | "yardage" | "website_url"
  >,
): CourseDetailFact[] {
  const facts: CourseDetailFact[] = [];

  const architectYear = formatArchitectYearLine(course.architect, course.year_opened);
  if (architectYear) {
    facts.push({ label: "Architect", value: architectYear });
  }

  if (course.holes) {
    facts.push({ label: "Holes", value: String(course.holes) });
  }

  if (course.par) {
    facts.push({ label: "Par", value: String(course.par) });
  }

  const yardageLabel = formatCourseYardage(course.yardage);
  if (yardageLabel) {
    facts.push({ label: "Yardage", value: yardageLabel });
  }

  if (course.website_url?.trim()) {
    facts.push({ label: "Website", value: course.website_url.trim() });
  }

  return facts;
}
