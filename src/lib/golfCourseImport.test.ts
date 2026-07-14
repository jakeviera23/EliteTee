import { describe, expect, it } from "vitest";
import { buildCourseImportRecordPreview } from "./golfCourseImport";

describe("buildCourseImportRecordPreview", () => {
  it("normalizes import record fields for staging", () => {
    expect(
      buildCourseImportRecordPreview({
        external_id: " provider-1 ",
        name: "  Cypress Point ",
        city: " Pebble Beach ",
        region: " CA ",
        country: " United States ",
        raw_payload: { holes: 18 },
      }),
    ).toEqual({
      external_id: "provider-1",
      name: "Cypress Point",
      city: "Pebble Beach",
      region: "CA",
      country: "United States",
      normalized_name: "cypress point",
      raw_payload: { holes: 18 },
    });
  });
});
