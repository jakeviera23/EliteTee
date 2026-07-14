import type {
  GolfCourseCuratedTag,
  GolfCourseEliteTier,
  GolfCourseFeaturedStatus,
} from "../types/golfCourseCurated";
import {
  GOLF_COURSE_CURATED_TAGS,
  GOLF_COURSE_ELITE_TIERS,
  GOLF_COURSE_FEATURED_STATUSES,
} from "../types/golfCourseCurated";
import { mergeProviderOwnedCourseUpdate } from "./courseImportPipeline.ts";

const ELITE_TIER_SET = new Set<string>(GOLF_COURSE_ELITE_TIERS);
const CURATED_TAG_SET = new Set<string>(GOLF_COURSE_CURATED_TAGS);
const FEATURED_STATUS_SET = new Set<string>(GOLF_COURSE_FEATURED_STATUSES);

export const ELITETEE_PROTECTED_COURSE_FIELDS = [
  "editorial_summary",
  "aliases",
  "architect",
  "year_opened",
  "course_style",
  "enrichment_status",
  "enrichment_version",
  "lifecycle_status",
  "elite_tier",
  "curated_tags",
  "featured_status",
] as const;

export type CuratedMetadataValidationResult =
  | {
      ok: true;
      value: {
        elite_tier: GolfCourseEliteTier | null;
        curated_tags: GolfCourseCuratedTag[];
        featured_status: GolfCourseFeaturedStatus | null;
      };
    }
  | { ok: false; error: string };

export function normalizeEliteTier(value: unknown): GolfCourseEliteTier | null {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!normalized) return null;
  return ELITE_TIER_SET.has(normalized) ? (normalized as GolfCourseEliteTier) : null;
}

export function normalizeFeaturedStatus(value: unknown): GolfCourseFeaturedStatus | null {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!normalized) return null;
  return FEATURED_STATUS_SET.has(normalized) ? (normalized as GolfCourseFeaturedStatus) : null;
}

export function normalizeCuratedTags(value: unknown): GolfCourseCuratedTag[] {
  const rawValues = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  const tags = new Set<GolfCourseCuratedTag>();
  for (const entry of rawValues) {
    const normalized = String(entry ?? "")
      .trim()
      .toLowerCase();
    if (!normalized) continue;
    if (CURATED_TAG_SET.has(normalized)) {
      tags.add(normalized as GolfCourseCuratedTag);
    }
  }

  return [...tags].sort();
}

export function validateCuratedMetadata(input: {
  elite_tier?: unknown;
  curated_tags?: unknown;
  featured_status?: unknown;
}): CuratedMetadataValidationResult {
  const eliteTierRaw = String(input.elite_tier ?? "").trim();
  const featuredStatusRaw = String(input.featured_status ?? "").trim();

  if (eliteTierRaw && !normalizeEliteTier(eliteTierRaw)) {
    return { ok: false, error: `Invalid elite_tier: ${eliteTierRaw}` };
  }

  if (featuredStatusRaw && !normalizeFeaturedStatus(featuredStatusRaw)) {
    return { ok: false, error: `Invalid featured_status: ${featuredStatusRaw}` };
  }

  return {
    ok: true,
    value: {
      elite_tier: normalizeEliteTier(input.elite_tier),
      curated_tags: normalizeCuratedTags(input.curated_tags),
      featured_status: normalizeFeaturedStatus(input.featured_status),
    },
  };
}

export function extractCuratedMetadata(input: Record<string, unknown>) {
  const validation = validateCuratedMetadata({
    elite_tier: input.elite_tier,
    curated_tags: input.curated_tags,
    featured_status: input.featured_status,
  });

  if (!validation.ok) {
    return validation;
  }

  return validation;
}

export function hasCuratedMetadata(input: {
  elite_tier?: unknown;
  curated_tags?: unknown;
  featured_status?: unknown;
}) {
  const validation = validateCuratedMetadata(input);
  if (!validation.ok) return false;

  return Boolean(
    validation.value.elite_tier ||
      validation.value.featured_status ||
      validation.value.curated_tags.length > 0,
  );
}

export function buildCuratedMetadataUpdate(
  input: Record<string, unknown>,
  existing?: Record<string, unknown>,
) {
  const validation = validateCuratedMetadata({
    elite_tier: input.elite_tier,
    curated_tags: input.curated_tags,
    featured_status: input.featured_status,
  });

  if (!validation.ok) {
    return { ok: false as const, error: validation.error };
  }

  const update: Record<string, unknown> = {};

  if (validation.value.elite_tier) {
    update.elite_tier = validation.value.elite_tier;
  }

  if (validation.value.featured_status) {
    update.featured_status = validation.value.featured_status;
  }

  if (validation.value.curated_tags.length > 0) {
    update.curated_tags = validation.value.curated_tags;
  }

  return {
    ok: true as const,
    update,
    preserved: {
      editorial_summary: existing?.editorial_summary ?? null,
      aliases: existing?.aliases ?? [],
      enrichment_status: existing?.enrichment_status ?? null,
      enrichment_version: existing?.enrichment_version ?? null,
    },
  };
}

export function providerUpdatePreservesCuratedMetadata(
  existing: Record<string, unknown>,
  providerIncoming: Record<string, unknown>,
) {
  const merged = mergeProviderOwnedCourseUpdate(existing, providerIncoming);

  return {
    elite_tier: existing.elite_tier ?? null,
    curated_tags: existing.curated_tags ?? [],
    featured_status: existing.featured_status ?? null,
    editorial_summary: existing.editorial_summary ?? null,
    aliases: existing.aliases ?? [],
    merged_description: merged.description,
  };
}
