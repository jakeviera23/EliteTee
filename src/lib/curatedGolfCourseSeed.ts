import {
  findGolfCourseDuplicateCandidatesLocal,
  normalizeGolfCourseNameForMatch,
} from "./golfCourseDuplicates.ts";
import {
  extractCuratedMetadata,
  hasCuratedMetadata,
} from "./golfCourseCurated.ts";
import {
  normalizeCountry,
  normalizeCourseName,
  normalizeLocationField,
  slugifyCourseName,
  validateImportRecord,
} from "./courseImportPipeline.ts";

export const CURATED_SOURCE_NAME = "elitetee_curated";

export const ELITETEE_LEGACY_SOURCE_NAMES = new Set(["elitetee_seed", "elitetee_curated"]);

export type CuratedSeedRecord = {
  external_id?: string | null;
  legacy_external_id?: string | null;
  name: string;
  slug?: string | null;
  city?: string | null;
  region?: string | null;
  country: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  website?: string | null;
  course_type?: string | null;
  access_type?: string | null;
  holes?: number | string | null;
  par?: number | string | null;
  yardage?: number | string | null;
  description?: string | null;
  architect?: string | null;
  year_opened?: number | string | null;
  elite_tier?: string | null;
  curated_tags?: string[] | string | null;
  featured_status?: string | null;
};

export type CuratedSeedFile = {
  version?: number;
  source_name?: string;
  region?: string | null;
  courses: CuratedSeedRecord[];
};

export type CuratedExistingCourse = {
  id: string;
  external_id?: string | null;
  slug: string;
  name: string;
  city?: string | null;
  country?: string | null;
  source_name?: string | null;
};

export type CuratedDuplicateResolution =
  | {
      action: "import";
      external_id: string;
      reason: string;
    }
  | {
      action: "update";
      external_id: string;
      reason: string;
      matched_course_id?: string;
    }
  | {
      action: "skip";
      reason: string;
      matched_course_id?: string;
    };

const CURATED_CSV_HEADERS = [
  "external_id",
  "legacy_external_id",
  "name",
  "slug",
  "city",
  "region",
  "country",
  "latitude",
  "longitude",
  "website",
  "course_type",
  "access_type",
  "holes",
  "par",
  "yardage",
  "description",
  "architect",
  "year_opened",
  "elite_tier",
  "curated_tags",
  "featured_status",
] as const;

export function buildCuratedExternalId(slug: string): string {
  const normalizedSlug = slugifyCourseName(slug) || slugifyCourseName("golf-course");
  return `elitetee-curated-${normalizedSlug}`;
}

function parseOptionalNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalInteger(value: unknown): number | null {
  const parsed = parseOptionalNumber(value);
  if (parsed === null) return null;
  return Number.isInteger(parsed) ? parsed : Math.trunc(parsed);
}

export function normalizeCuratedSeedRecord(raw: Record<string, unknown>): CuratedSeedRecord | null {
  const name = normalizeCourseName(raw.name);
  const country = normalizeCountry(raw.country);
  if (!name || !country) return null;

  const slug =
    normalizeLocationField(raw.slug) ||
    slugifyCourseName(name);

  return {
    external_id: normalizeLocationField(raw.external_id),
    legacy_external_id: normalizeLocationField(raw.legacy_external_id),
    name,
    slug,
    city: normalizeLocationField(raw.city),
    region: normalizeLocationField(raw.region ?? raw.state ?? raw.province),
    country,
    latitude: parseOptionalNumber(raw.latitude ?? raw.lat),
    longitude: parseOptionalNumber(raw.longitude ?? raw.lng ?? raw.lon),
    website: normalizeLocationField(raw.website ?? raw.website_url),
    course_type: normalizeLocationField(raw.course_type ?? raw.type),
    access_type: normalizeLocationField(raw.access_type ?? raw.access),
    holes: parseOptionalInteger(raw.holes),
    par: parseOptionalInteger(raw.par),
    yardage: parseOptionalInteger(raw.yardage),
    description: normalizeLocationField(raw.description),
    architect: normalizeLocationField(raw.architect),
    year_opened: parseOptionalInteger(raw.year_opened ?? raw.opened),
    elite_tier: normalizeLocationField(raw.elite_tier),
    curated_tags:
      raw.curated_tags === undefined || raw.curated_tags === null || raw.curated_tags === ""
        ? null
        : (raw.curated_tags as string | string[]),
    featured_status: normalizeLocationField(raw.featured_status),
  };
}

export function curatedSeedToPipelineRecord(record: CuratedSeedRecord): Record<string, unknown> {
  const slug = record.slug?.trim() || slugifyCourseName(record.name);
  const externalId = record.external_id?.trim() || buildCuratedExternalId(slug);

  return {
    external_id: externalId,
    legacy_external_id: record.legacy_external_id?.trim() || null,
    name: record.name,
    slug,
    city: record.city,
    region: record.region,
    country: record.country,
    latitude: record.latitude,
    longitude: record.longitude,
    website: record.website,
    website_url: record.website,
    course_type: record.course_type,
    access_type: record.access_type,
    holes: record.holes,
    par: record.par,
    yardage: record.yardage,
    description: record.description,
    architect: record.architect,
    year_opened: record.year_opened,
    elite_tier: record.elite_tier,
    curated_tags: record.curated_tags ?? [],
    featured_status: record.featured_status,
    source_name: CURATED_SOURCE_NAME,
    source_updated_at: new Date().toISOString(),
  };
}

export function parseCuratedSeedJson(content: string): CuratedSeedRecord[] {
  const parsed = JSON.parse(content) as unknown;

  if (Array.isArray(parsed)) {
    return parsed
      .map((row) => normalizeCuratedSeedRecord((row ?? {}) as Record<string, unknown>))
      .filter((row): row is CuratedSeedRecord => row !== null);
  }

  if (parsed && typeof parsed === "object" && Array.isArray((parsed as CuratedSeedFile).courses)) {
    return (parsed as CuratedSeedFile).courses
      .map((row) => normalizeCuratedSeedRecord((row ?? {}) as Record<string, unknown>))
      .filter((row): row is CuratedSeedRecord => row !== null);
  }

  throw new Error("Curated seed JSON must be an array or an object with a courses array.");
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

export function parseCuratedSeedCsv(content: string): CuratedSeedRecord[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  if (lines.length === 0) return [];

  const header = parseCsvLine(lines[0]).map((value) => value.trim().toLowerCase());
  const records: CuratedSeedRecord[] = [];

  for (const line of lines.slice(1)) {
    const values = parseCsvLine(line);
    const row: Record<string, unknown> = {};

    header.forEach((column, index) => {
      const value = values[index]?.trim() ?? "";
      row[column] = value === "" ? null : value;
    });

    const normalized = normalizeCuratedSeedRecord(row);
    if (normalized) records.push(normalized);
  }

  return records;
}

export function parseCuratedSeedFile(content: string, filename: string): CuratedSeedRecord[] {
  if (filename.toLowerCase().endsWith(".csv")) {
    return parseCuratedSeedCsv(content);
  }
  if (filename.toLowerCase().endsWith(".json")) {
    return parseCuratedSeedJson(content);
  }
  throw new Error(`Unsupported curated seed file type: ${filename}`);
}

export function dedupeCuratedSeedRecords(records: CuratedSeedRecord[]): CuratedSeedRecord[] {
  const seenExternalIds = new Set<string>();
  const seenIdentityKeys = new Set<string>();
  const deduped: CuratedSeedRecord[] = [];

  for (const record of records) {
    const slug = record.slug?.trim() || slugifyCourseName(record.name);
    const externalId = record.external_id?.trim() || buildCuratedExternalId(slug);
    const identityKey = [
      normalizeGolfCourseNameForMatch(record.name),
      normalizeGolfCourseNameForMatch(record.city),
      normalizeGolfCourseNameForMatch(record.country),
    ].join("|");

    if (seenExternalIds.has(externalId) || seenIdentityKeys.has(identityKey)) {
      continue;
    }

    seenExternalIds.add(externalId);
    seenIdentityKeys.add(identityKey);
    deduped.push(record);
  }

  return deduped;
}

export function resolveCuratedImportExternalId(
  record: CuratedSeedRecord,
  existingCourses: CuratedExistingCourse[] = [],
): CuratedDuplicateResolution {
  const slug = record.slug?.trim() || slugifyCourseName(record.name);
  const curatedExternalId = record.external_id?.trim() || buildCuratedExternalId(slug);
  const legacyExternalId = record.legacy_external_id?.trim() || null;

  if (legacyExternalId) {
    const legacyMatch = existingCourses.find((course) => course.external_id === legacyExternalId);
    if (legacyMatch) {
      return {
        action: "update",
        external_id: legacyMatch.external_id ?? legacyExternalId,
        reason: "legacy_external_id",
        matched_course_id: legacyMatch.id,
      };
    }
  }

  const externalMatch = existingCourses.find((course) => course.external_id === curatedExternalId);
  if (externalMatch) {
    return {
      action: "update",
      external_id: externalMatch.external_id ?? curatedExternalId,
      reason: "external_id",
      matched_course_id: externalMatch.id,
    };
  }

  const slugMatch = existingCourses.find((course) => course.slug === slug);
  if (slugMatch?.external_id) {
    return {
      action: "update",
      external_id: slugMatch.external_id,
      reason: "slug",
      matched_course_id: slugMatch.id,
    };
  }

  const duplicateCandidates = findGolfCourseDuplicateCandidatesLocal(
    {
      external_id: curatedExternalId,
      name: record.name,
      city: record.city,
      country: record.country,
    },
    existingCourses.map((course) => ({
      id: course.id,
      external_id: course.external_id,
      name: course.name,
      city: course.city,
      country: course.country,
    })),
  );

  if (duplicateCandidates.length > 0) {
    const matchedCourse = existingCourses.find(
      (course) => course.id === duplicateCandidates[0]?.golf_course_id,
    );
    const matchedSource = matchedCourse?.source_name?.trim() || "";

    if (ELITETEE_LEGACY_SOURCE_NAMES.has(matchedSource) && matchedCourse?.external_id) {
      return {
        action: "update",
        external_id: matchedCourse.external_id,
        reason: duplicateCandidates[0]?.match_reason ?? "duplicate",
        matched_course_id: matchedCourse.id,
      };
    }

    return {
      action: "skip",
      reason: duplicateCandidates[0]?.match_reason ?? "duplicate",
      matched_course_id: matchedCourse?.id,
    };
  }

  return {
    action: "import",
    external_id: curatedExternalId,
    reason: "clean",
  };
}

export function applyCuratedDuplicateResolution(
  record: CuratedSeedRecord,
  resolution: CuratedDuplicateResolution,
): Record<string, unknown> | null {
  if (resolution.action === "skip") {
    return null;
  }

  const pipelineRecord = curatedSeedToPipelineRecord(record);
  pipelineRecord.external_id = resolution.external_id;
  return pipelineRecord;
}

export function validateCuratedPipelineRecord(record: Record<string, unknown>) {
  const required = validateImportRecord({
    external_id: record.external_id ? String(record.external_id) : null,
    name: record.name ? String(record.name) : null,
    country: record.country ? String(record.country) : null,
  });

  if (!required.ok) {
    return required;
  }

  const metadata = extractCuratedMetadata(record);
  if (!metadata.ok) {
    return metadata;
  }

  return required;
}

export function curatedEnrichmentFields(record: Record<string, unknown>) {
  return {
    architect: record.architect ? String(record.architect) : null,
    year_opened: parseOptionalInteger(record.year_opened),
    holes: parseOptionalInteger(record.holes),
    par: parseOptionalInteger(record.par),
    yardage: parseOptionalInteger(record.yardage),
    description: record.description ? String(record.description).trim() : null,
  };
}

export function curatedRankingFields(record: Record<string, unknown>) {
  const metadata = extractCuratedMetadata(record);
  if (!metadata.ok) {
    return {
      elite_tier: null,
      curated_tags: [] as string[],
      featured_status: null,
    };
  }

  return metadata.value;
}

export function hasCuratedEnrichmentFields(record: Record<string, unknown>) {
  const enrichment = curatedEnrichmentFields(record);
  return Boolean(
    enrichment.architect ||
      enrichment.year_opened ||
      enrichment.holes ||
      enrichment.par ||
      enrichment.yardage ||
      enrichment.description,
  );
}

export function hasCuratedRankingFields(record: Record<string, unknown>) {
  return hasCuratedMetadata({
    elite_tier: record.elite_tier,
    curated_tags: record.curated_tags,
    featured_status: record.featured_status,
  });
}

export function curatedPostImportFields(record: Record<string, unknown>) {
  return {
    ...curatedEnrichmentFields(record),
    ...curatedRankingFields(record),
  };
}

export function hasCuratedPostImportFields(record: Record<string, unknown>) {
  return hasCuratedEnrichmentFields(record) || hasCuratedRankingFields(record);
}

export function buildCuratedPostImportUpdate(record: Record<string, unknown>) {
  const enrichment = curatedEnrichmentFields(record);
  const ranking = curatedRankingFields(record);
  const update: Record<string, unknown> = {};

  if (enrichment.architect) update.architect = enrichment.architect;
  if (enrichment.year_opened) update.year_opened = enrichment.year_opened;
  if (enrichment.holes) update.holes = enrichment.holes;
  if (enrichment.par) update.par = enrichment.par;
  if (enrichment.yardage) update.yardage = enrichment.yardage;
  if (enrichment.description) update.description = enrichment.description;
  if (ranking.elite_tier) update.elite_tier = ranking.elite_tier;
  if (ranking.featured_status) update.featured_status = ranking.featured_status;
  if (ranking.curated_tags.length > 0) update.curated_tags = ranking.curated_tags;

  return update;
}

export function getCuratedCsvTemplateHeader(): string {
  return CURATED_CSV_HEADERS.join(",");
}
