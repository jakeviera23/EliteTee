import type { GolfCourseDuplicateCandidate } from "../types/golfCourseImport";

const COUNTRY_ALIASES = new Map<string, string>([
  ["us", "United States"],
  ["usa", "United States"],
  ["u.s.", "United States"],
  ["u.s.a.", "United States"],
  ["united states of america", "United States"],
  ["uk", "United Kingdom"],
  ["u.k.", "United Kingdom"],
  ["gb", "United Kingdom"],
  ["great britain", "United Kingdom"],
  ["england", "United Kingdom"],
  ["scotland", "United Kingdom"],
  ["wales", "United Kingdom"],
  ["northern ireland", "United Kingdom"],
  ["ca", "Canada"],
  ["can", "Canada"],
  ["au", "Australia"],
  ["aus", "Australia"],
  ["nz", "New Zealand"],
  ["ie", "Ireland"],
  ["irl", "Ireland"],
  ["za", "South Africa"],
  ["ae", "United Arab Emirates"],
]);

const CURATED_IMAGE_SOURCES = new Set(["admin", "verified_rep"]);

export type ImportValidationResult =
  | { ok: true; value: { external_id: string; name: string; country: string } }
  | { ok: false; error: string };

export type ImportAction = "insert" | "update" | "duplicate";

export type NormalizedProviderCourse = {
  external_id: string | null;
  name: string;
  slug: string;
  city: string | null;
  region: string | null;
  country: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  website_url: string | null;
  course_type: string | null;
  access_type: string | null;
  holes: number | null;
  description: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
  image_source: string | null;
  image_attribution: string | null;
  image_license: string | null;
  image_updated_at: string | null;
  source_name: string;
  source_updated_at: string;
};

export function normalizeCountry(country: unknown): string | null {
  const trimmed = String(country ?? "").trim();
  if (!trimmed) return null;
  return COUNTRY_ALIASES.get(trimmed.toLowerCase()) ?? trimmed;
}

export function normalizeCourseName(name: unknown): string {
  return String(name ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeLocationField(value: unknown): string | null {
  const trimmed = String(value ?? "").trim();
  return trimmed || null;
}

export function slugifyCourseName(name: unknown): string {
  return normalizeCourseName(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function validateImportRecord(record: {
  external_id?: string | null;
  name?: string | null;
  country?: string | null;
}): ImportValidationResult {
  const externalId = String(record.external_id ?? "").trim();
  const name = normalizeCourseName(record.name);
  const country = normalizeCountry(record.country);

  if (!externalId) {
    return { ok: false, error: "external_id is required." };
  }
  if (!name) {
    return { ok: false, error: "name is required." };
  }
  if (!country) {
    return { ok: false, error: "country is required." };
  }

  return { ok: true, value: { external_id: externalId, name, country } };
}

export function resolveImportAction(candidates: GolfCourseDuplicateCandidate[] = []): ImportAction {
  if (candidates.some((candidate) => candidate.match_reason === "external_id")) {
    return "update";
  }
  if (candidates.length > 0) {
    return "duplicate";
  }
  return "insert";
}

export function lifecycleStatusForImportAction(action: ImportAction): "draft" | null {
  if (action === "insert") return "draft";
  return null;
}

export function mergeProviderOwnedCourseUpdate(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  const merged = { ...existing };

  const providerFields = [
    "name",
    "city",
    "region",
    "country",
    "latitude",
    "longitude",
    "website_url",
    "course_type",
    "access_type",
    "holes",
    "description",
    "source_name",
    "source_updated_at",
    "external_id",
  ];

  for (const field of providerFields) {
    if (incoming[field] !== undefined && incoming[field] !== null && incoming[field] !== "") {
      merged[field] = incoming[field];
    }
  }

  const imageSource = String(existing.image_source ?? "").trim();
  if (!CURATED_IMAGE_SOURCES.has(imageSource)) {
    for (const field of [
      "image_url",
      "thumbnail_url",
      "image_source",
      "image_attribution",
      "image_license",
      "image_updated_at",
    ]) {
      if (incoming[field] !== undefined && incoming[field] !== null && incoming[field] !== "") {
        merged[field] = incoming[field];
      }
    }
  }

  return merged;
}

export function buildFailedRecordLog(
  record: { external_id?: string | null; name?: string | null; country?: string | null },
  errorMessage: string,
) {
  return {
    external_id: record.external_id ?? null,
    name: record.name ?? null,
    country: record.country ?? null,
    status: "error" as const,
    error_message: errorMessage,
  };
}

export function normalizeProviderCourse(
  raw: Record<string, unknown>,
  providerName = "external_provider",
): NormalizedProviderCourse | null {
  const name = normalizeCourseName(raw.name ?? raw.course_name ?? "");
  if (!name) return null;

  const city = normalizeLocationField(raw.city);
  const region = normalizeLocationField(raw.region ?? raw.state ?? raw.province);
  const country = normalizeCountry(raw.country);

  const imageUrl = raw.image_url ?? raw.image ?? raw.photo_url ?? null;
  const thumbnailUrl = raw.thumbnail_url ?? raw.thumb_url ?? raw.image_thumbnail ?? null;

  return {
    external_id: raw.id ? String(raw.id) : raw.external_id ? String(raw.external_id) : null,
    name,
    slug: raw.slug ? String(raw.slug).trim() : slugifyCourseName(name),
    city,
    region,
    country,
    latitude: (raw.latitude ?? raw.lat ?? null) as number | string | null,
    longitude: (raw.longitude ?? raw.lng ?? raw.lon ?? null) as number | string | null,
    website_url: (raw.website ?? raw.website_url ?? null) as string | null,
    course_type: (raw.course_type ?? raw.type ?? null) as string | null,
    access_type: (raw.access_type ?? raw.access ?? null) as string | null,
    holes: (raw.holes ?? null) as number | null,
    description: (raw.description ?? null) as string | null,
    image_url: imageUrl ? String(imageUrl).trim() : null,
    thumbnail_url: thumbnailUrl ? String(thumbnailUrl).trim() : null,
    image_source: raw.image_source
      ? String(raw.image_source)
      : imageUrl
        ? providerName
        : null,
    image_attribution: (raw.image_attribution ?? raw.photo_credit ?? raw.attribution ?? null) as
      | string
      | null,
    image_license: (raw.image_license ?? raw.license ?? null) as string | null,
    image_updated_at: imageUrl ? String(raw.image_updated_at ?? new Date().toISOString()) : null,
    source_name: providerName,
    source_updated_at: String(raw.updated_at ?? new Date().toISOString()),
  };
}

export function summarizeBatch(batch: Record<string, unknown>) {
  return {
    id: batch.id,
    status: batch.status,
    total_records: Number(batch.total_records ?? 0),
    processed_count: Number(batch.processed_count ?? 0),
    success_count: Number(batch.success_count ?? 0),
    inserted_count: Number(batch.inserted_count ?? 0),
    updated_count: Number(batch.updated_count ?? 0),
    duplicate_count: Number(batch.duplicate_count ?? 0),
    error_count: Number(batch.error_count ?? 0),
  };
}
