import { describe, expect, it } from "vitest";
import {
  buildCourseLocationSnapshot,
  mergeStructuredCourseLocation,
  parseLegacyCourseLocation,
} from "./courseLocationParse";

describe("parseLegacyCourseLocation", () => {
  it("parses Southampton NY into city, region, and country", () => {
    expect(parseLegacyCourseLocation("Southampton NY")).toEqual({
      city: "Southampton",
      region: "NY",
      country: "United States",
      confidence: "high",
      source: "us_suffix",
    });
  });

  it("parses Southampton, NY the same as Southampton NY", () => {
    const comma = parseLegacyCourseLocation("Southampton, NY");
    const suffix = parseLegacyCourseLocation("Southampton NY");

    expect(comma.city).toBe(suffix.city);
    expect(comma.region).toBe("NY");
    expect(comma.country).toBe("United States");
  });

  it("parses Juno Beach Florida into city, region, and country", () => {
    expect(parseLegacyCourseLocation("Juno Beach Florida")).toEqual({
      city: "Juno Beach",
      region: "Florida",
      country: "United States",
      confidence: "high",
      source: "us_suffix",
    });
  });

  it("parses Manakin Sabot VA into city, region, and country", () => {
    expect(parseLegacyCourseLocation("Manakin Sabot VA")).toEqual({
      city: "Manakin Sabot",
      region: "VA",
      country: "United States",
      confidence: "high",
      source: "us_suffix",
    });
  });

  it("leaves low-confidence strings editable instead of guessing region", () => {
    const parsed = parseLegacyCourseLocation("Hidden Valley");
    expect(parsed.city).toBe("Hidden Valley");
    expect(parsed.region).toBe("");
    expect(parsed.confidence).toBe("low");
  });
});

describe("mergeStructuredCourseLocation", () => {
  it("prefers structured course fields over legacy round location", () => {
    expect(
      mergeStructuredCourseLocation({
        city: "Southampton",
        region: "New York",
        country: "United States",
        fallbackLocation: "Southampton NY",
      }),
    ).toMatchObject({
      city: "Southampton",
      region: "New York",
      country: "United States",
      source: "structured",
    });
  });
});

describe("buildCourseLocationSnapshot", () => {
  it("builds a comma-separated round location snapshot", () => {
    expect(
      buildCourseLocationSnapshot({
        city: "Juno Beach",
        region: "Florida",
        country: "United States",
      }),
    ).toBe("Juno Beach, Florida, United States");
  });
});
