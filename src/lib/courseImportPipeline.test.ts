import { describe, expect, it } from "vitest";
import {
  buildFailedRecordLog,
  lifecycleStatusForImportAction,
  mergeProviderOwnedCourseUpdate,
  normalizeCountry,
  normalizeProviderCourse,
  resolveImportAction,
  validateImportRecord,
} from "./courseImportPipeline.ts";

describe("validateImportRecord", () => {
  it("fails when country is missing", () => {
    expect(
      validateImportRecord({
        external_id: "provider-1",
        name: "Hidden Valley",
        country: "",
      }),
    ).toEqual({ ok: false, error: "country is required." });
  });

  it("accepts a valid staged record", () => {
    expect(
      validateImportRecord({
        external_id: "provider-1",
        name: "Hidden Valley",
        country: "US",
      }),
    ).toEqual({
      ok: true,
      value: {
        external_id: "provider-1",
        name: "Hidden Valley",
        country: "United States",
      },
    });
  });
});

describe("resolveImportAction", () => {
  it("creates a draft course for clean imports", () => {
    const action = resolveImportAction([]);
    expect(action).toBe("insert");
    expect(lifecycleStatusForImportAction(action)).toBe("draft");
  });

  it("marks duplicate imports without creating a course", () => {
    expect(
      resolveImportAction([
        {
          golf_course_id: "course-1",
          match_reason: "normalized_name_city_country",
          match_rank: 2,
        },
      ]),
    ).toBe("duplicate");
  });

  it("updates when the external_id already exists", () => {
    expect(
      resolveImportAction([
        {
          golf_course_id: "course-1",
          match_reason: "external_id",
          match_rank: 1,
        },
      ]),
    ).toBe("update");
  });
});

describe("mergeProviderOwnedCourseUpdate", () => {
  it("updates provider-owned fields without overwriting editorial data", () => {
    const existing = {
      name: "Old Name",
      city: "Old City",
      description: "Provider description",
      editorial_summary: "Curated EliteTee summary",
      aliases: ["Legacy"],
      architect: "Old Tom",
      year_opened: 1890,
      course_style: "links",
      enrichment_status: "completed",
      enrichment_version: "v1",
      lifecycle_status: "published",
      image_source: "admin",
      image_url: "https://cdn.example.com/curated.jpg",
      source_name: "elitetee_seed",
    };

    const incoming = {
      name: "New Provider Name",
      city: "New City",
      country: "United States",
      description: "New provider description",
      editorial_summary: "Should not apply",
      aliases: ["Ignored"],
      architect: "Ignored",
      image_url: "https://provider.example.com/new.jpg",
      image_source: "fixture_provider",
      source_name: "fixture_provider",
      source_updated_at: "2026-07-13T00:00:00.000Z",
    };

    expect(mergeProviderOwnedCourseUpdate(existing, incoming)).toEqual({
      name: "New Provider Name",
      city: "New City",
      description: "New provider description",
      country: "United States",
      editorial_summary: "Curated EliteTee summary",
      aliases: ["Legacy"],
      architect: "Old Tom",
      year_opened: 1890,
      course_style: "links",
      enrichment_status: "completed",
      enrichment_version: "v1",
      lifecycle_status: "published",
      image_source: "admin",
      image_url: "https://cdn.example.com/curated.jpg",
      source_name: "fixture_provider",
      source_updated_at: "2026-07-13T00:00:00.000Z",
    });
  });
});

describe("normalizeProviderCourse", () => {
  it("normalizes country names and provider fields", () => {
    expect(
      normalizeProviderCourse(
        {
          id: "fixture-clean-001",
          name: "  Northwood Hills Golf Club ",
          city: "Dallas",
          state: "TX",
          country: "US",
          holes: 18,
        },
        "fixture_provider",
      ),
    ).toMatchObject({
      external_id: "fixture-clean-001",
      name: "Northwood Hills Golf Club",
      country: "United States",
      region: "TX",
      source_name: "fixture_provider",
    });
  });
});

describe("buildFailedRecordLog", () => {
  it("logs failed records with error messages", () => {
    expect(
      buildFailedRecordLog(
        { external_id: "bad-1", name: "Mystery Links", country: null },
        "country is required.",
      ),
    ).toEqual({
      external_id: "bad-1",
      name: "Mystery Links",
      country: null,
      status: "error",
      error_message: "country is required.",
    });
  });
});

describe("normalizeCountry", () => {
  it("maps common country aliases", () => {
    expect(normalizeCountry("usa")).toBe("United States");
    expect(normalizeCountry("United Kingdom")).toBe("United Kingdom");
  });
});
