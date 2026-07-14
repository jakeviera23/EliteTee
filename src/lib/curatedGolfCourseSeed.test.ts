import { describe, expect, it } from "vitest";
import {
  applyCuratedDuplicateResolution,
  buildCuratedExternalId,
  curatedSeedToPipelineRecord,
  CURATED_SOURCE_NAME,
  dedupeCuratedSeedRecords,
  getCuratedCsvTemplateHeader,
  hasCuratedEnrichmentFields,
  normalizeCuratedSeedRecord,
  parseCuratedSeedCsv,
  parseCuratedSeedJson,
  resolveCuratedImportExternalId,
  validateCuratedPipelineRecord,
} from "./curatedGolfCourseSeed";

describe("normalizeCuratedSeedRecord", () => {
  it("normalizes curated fields and leaves unknown values empty", () => {
    expect(
      normalizeCuratedSeedRecord({
        name: "  Pebble Beach Golf Links ",
        city: "Pebble Beach",
        region: "CA",
        country: "US",
        website: "https://www.pebblebeach.com",
      }),
    ).toEqual({
      external_id: null,
      legacy_external_id: null,
      name: "Pebble Beach Golf Links",
      slug: "pebble-beach-golf-links",
      city: "Pebble Beach",
      region: "CA",
      country: "United States",
      latitude: null,
      longitude: null,
      website: "https://www.pebblebeach.com",
      course_type: null,
      access_type: null,
      holes: null,
      par: null,
      yardage: null,
      description: null,
      architect: null,
      year_opened: null,
      elite_tier: null,
      curated_tags: null,
      featured_status: null,
    });
  });
});

describe("curatedSeedToPipelineRecord", () => {
  it("sets source_name to elitetee_curated", () => {
    const record = curatedSeedToPipelineRecord({
      name: "Bandon Dunes",
      country: "United States",
      city: "Bandon",
      region: "Oregon",
    });

    expect(record.source_name).toBe(CURATED_SOURCE_NAME);
    expect(record.external_id).toBe(buildCuratedExternalId("bandon-dunes"));
  });
});

describe("parseCuratedSeedJson", () => {
  it("parses wrapped JSON seed files", () => {
    const records = parseCuratedSeedJson(
      JSON.stringify({
        version: 1,
        courses: [{ name: "Royal Melbourne Golf Club — West Course", country: "Australia" }],
      }),
    );

    expect(records).toHaveLength(1);
    expect(records[0]?.name).toBe("Royal Melbourne Golf Club — West Course");
  });
});

describe("parseCuratedSeedCsv", () => {
  it("parses CSV rows with empty optional fields", () => {
    const csv = `${getCuratedCsvTemplateHeader()}
elitetee-curated-test-course,,Test Course,test-course,Test City,Test Region,United States,,,,links,public,18,,`;

    const records = parseCuratedSeedCsv(csv);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      external_id: "elitetee-curated-test-course",
      name: "Test Course",
      country: "United States",
      architect: null,
      year_opened: null,
    });
  });
});

describe("resolveCuratedImportExternalId", () => {
  const existingCourses = [
    {
      id: "seed-1",
      external_id: "elitetee-seed-pebble",
      slug: "pebble-beach-golf-links",
      name: "Pebble Beach Golf Links",
      city: "Pebble Beach",
      country: "United States",
      source_name: "elitetee_seed",
    },
    {
      id: "provider-1",
      external_id: "provider-pebble",
      slug: "pebble-beach-golf-links-provider",
      name: "Pebble Beach Golf Links",
      city: "Pebble Beach",
      country: "United States",
      source_name: "external_provider",
    },
  ];

  it("updates legacy EliteTee seed rows instead of creating duplicates", () => {
    expect(
      resolveCuratedImportExternalId(
        {
          name: "Pebble Beach Golf Links",
          country: "United States",
          city: "Pebble Beach",
          legacy_external_id: "elitetee-seed-pebble",
        },
        existingCourses,
      ),
    ).toEqual({
      action: "update",
      external_id: "elitetee-seed-pebble",
      reason: "legacy_external_id",
      matched_course_id: "seed-1",
    });
  });

  it("skips duplicates that match non-EliteTee courses", () => {
    expect(
      resolveCuratedImportExternalId(
        {
          name: "Pebble Beach Golf Links",
          country: "United States",
          city: "Pebble Beach",
        },
        [existingCourses[1]],
      ),
    ).toEqual({
      action: "skip",
      reason: "normalized_name_city_country",
      matched_course_id: "provider-1",
    });
  });

  it("imports clean curated courses with stable external IDs", () => {
    expect(
      resolveCuratedImportExternalId(
        {
          name: "Sand Hills Golf Club",
          country: "United States",
          city: "Mullen",
        },
        existingCourses,
      ),
    ).toEqual({
      action: "import",
      external_id: buildCuratedExternalId("sand-hills-golf-club"),
      reason: "clean",
    });
  });
});

describe("applyCuratedDuplicateResolution", () => {
  it("returns null when a duplicate should be skipped", () => {
    expect(
      applyCuratedDuplicateResolution(
        { name: "Example", country: "United States" },
        { action: "skip", reason: "duplicate" },
      ),
    ).toBeNull();
  });

  it("rewrites external_id for update resolutions", () => {
    expect(
      applyCuratedDuplicateResolution(
        {
          name: "Pebble Beach Golf Links",
          country: "United States",
          legacy_external_id: "elitetee-seed-pebble",
        },
        {
          action: "update",
          external_id: "elitetee-seed-pebble",
          reason: "legacy_external_id",
        },
      ),
    ).toMatchObject({
      external_id: "elitetee-seed-pebble",
      source_name: CURATED_SOURCE_NAME,
    });
  });
});

describe("dedupeCuratedSeedRecords", () => {
  it("removes duplicate rows within a seed file", () => {
    const deduped = dedupeCuratedSeedRecords([
      { name: "Bandon Dunes", country: "United States", city: "Bandon" },
      { name: "Bandon Dunes", country: "United States", city: "Bandon" },
    ]);

    expect(deduped).toHaveLength(1);
  });
});

describe("validateCuratedPipelineRecord", () => {
  it("fails when country is missing", () => {
    expect(
      validateCuratedPipelineRecord({
        external_id: "elitetee-curated-test",
        name: "Test Course",
        country: "",
      }),
    ).toEqual({ ok: false, error: "country is required." });
  });
});

describe("hasCuratedEnrichmentFields", () => {
  it("detects architect and year_opened enrichment", () => {
    expect(hasCuratedEnrichmentFields({ architect: "Donald Ross" })).toBe(true);
    expect(hasCuratedEnrichmentFields({ year_opened: 1910 })).toBe(true);
    expect(hasCuratedEnrichmentFields({ name: "Example" })).toBe(false);
  });
});
