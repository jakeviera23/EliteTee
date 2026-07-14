import { describe, expect, it } from "vitest";
import { mergeProviderOwnedCourseUpdate } from "./courseImportPipeline";
import {
  buildCuratedMetadataUpdate,
  normalizeCuratedTags,
  normalizeEliteTier,
  providerUpdatePreservesCuratedMetadata,
  validateCuratedMetadata,
} from "./golfCourseCurated.ts";
import {
  buildCuratedPostImportUpdate,
  normalizeCuratedSeedRecord,
  validateCuratedPipelineRecord,
} from "./curatedGolfCourseSeed";

describe("validateCuratedMetadata", () => {
  it("accepts valid tier and tag values", () => {
    expect(
      validateCuratedMetadata({
        elite_tier: "global_icon",
        curated_tags: ["historic", "links", "bucket_list"],
        featured_status: "featured",
      }),
    ).toEqual({
      ok: true,
      value: {
        elite_tier: "global_icon",
        curated_tags: ["bucket_list", "historic", "links"],
        featured_status: "featured",
      },
    });
  });

  it("rejects invalid elite_tier values", () => {
    expect(
      validateCuratedMetadata({
        elite_tier: "mythic_course",
      }),
    ).toEqual({
      ok: false,
      error: "Invalid elite_tier: mythic_course",
    });
  });

  it("keeps metadata empty when values are unknown", () => {
    expect(validateCuratedMetadata({})).toEqual({
      ok: true,
      value: {
        elite_tier: null,
        curated_tags: [],
        featured_status: null,
      },
    });
  });
});

describe("normalizeCuratedTags", () => {
  it("parses comma-separated CSV tags and ignores invalid tags", () => {
    expect(normalizeCuratedTags("historic, bucket_list, not_a_real_tag, links")).toEqual([
      "bucket_list",
      "historic",
      "links",
    ]);
  });
});

describe("buildCuratedPostImportUpdate", () => {
  it("imports tier values for curated seeds", () => {
    expect(
      buildCuratedPostImportUpdate({
        elite_tier: "destination",
        curated_tags: ["resort", "championship"],
        featured_status: "featured",
      }),
    ).toEqual({
      elite_tier: "destination",
      curated_tags: ["championship", "resort"],
      featured_status: "featured",
    });
  });

  it("imports enrichment fields for curated seeds", () => {
    expect(
      buildCuratedPostImportUpdate({
        architect: "Donald Ross",
        year_opened: 1907,
        holes: 18,
        par: 72,
        yardage: 7588,
        description: "Championship parkland course.",
      }),
    ).toEqual({
      architect: "Donald Ross",
      year_opened: 1907,
      holes: 18,
      par: 72,
      yardage: 7588,
      description: "Championship parkland course.",
    });
  });

  it("returns an empty update when metadata is missing", () => {
    expect(buildCuratedPostImportUpdate({ name: "Example Course" })).toEqual({});
  });
});

describe("providerUpdatePreservesCuratedMetadata", () => {
  it("preserves existing editorial and curated fields during provider updates", () => {
    const existing = {
      name: "Pebble Beach Golf Links",
      editorial_summary: "Member-facing editorial copy",
      aliases: ["Pebble"],
      elite_tier: "global_icon",
      curated_tags: ["bucket_list", "links"],
      featured_status: "featured",
      enrichment_status: "completed",
      enrichment_version: "v1",
    };

    const providerIncoming = {
      name: "Pebble Beach Golf Links",
      description: "Provider description",
      editorial_summary: "Should not replace editorial",
      elite_tier: "notable",
      curated_tags: ["public_access"],
      featured_status: "standard",
    };

    const merged = mergeProviderOwnedCourseUpdate(existing, providerIncoming);
    const preserved = providerUpdatePreservesCuratedMetadata(existing, providerIncoming);

    expect(merged.editorial_summary).toBe("Member-facing editorial copy");
    expect(merged.aliases).toEqual(["Pebble"]);
    expect(merged.elite_tier).toBe("global_icon");
    expect(merged.curated_tags).toEqual(["bucket_list", "links"]);
    expect(merged.featured_status).toBe("featured");
    expect(preserved.elite_tier).toBe("global_icon");
    expect(preserved.curated_tags).toEqual(["bucket_list", "links"]);
    expect(preserved.featured_status).toBe("featured");
    expect(preserved.editorial_summary).toBe("Member-facing editorial copy");
  });
});

describe("validateCuratedPipelineRecord", () => {
  it("rejects invalid tier values during import validation", () => {
    expect(
      validateCuratedPipelineRecord({
        external_id: "elitetee-curated-test",
        name: "Test Course",
        country: "United States",
        elite_tier: "invalid_tier",
      }),
    ).toEqual({
      ok: false,
      error: "Invalid elite_tier: invalid_tier",
    });
  });
});

describe("normalizeCuratedSeedRecord", () => {
  it("normalizes ranking metadata from seed rows", () => {
    expect(
      normalizeCuratedSeedRecord({
        name: "Pebble Beach Golf Links",
        country: "United States",
        elite_tier: "global_icon",
        curated_tags: ["bucket_list", "links"],
        featured_status: "featured",
      }),
    ).toMatchObject({
      elite_tier: "global_icon",
      curated_tags: ["bucket_list", "links"],
      featured_status: "featured",
    });
  });
});

describe("buildCuratedMetadataUpdate", () => {
  it("only writes provided curated metadata fields", () => {
    expect(
      buildCuratedMetadataUpdate(
        {
          elite_tier: "notable",
          curated_tags: ["public_access"],
        },
        {
          editorial_summary: "Keep me",
          aliases: ["Legacy"],
        },
      ),
    ).toEqual({
      ok: true,
      update: {
        elite_tier: "notable",
        curated_tags: ["public_access"],
      },
      preserved: {
        editorial_summary: "Keep me",
        aliases: ["Legacy"],
        enrichment_status: null,
        enrichment_version: null,
      },
    });
  });
});

describe("normalizeEliteTier", () => {
  it("normalizes known tier values", () => {
    expect(normalizeEliteTier("GLOBAL_ICON")).toBe("global_icon");
    expect(normalizeEliteTier("unknown")).toBeNull();
  });
});
