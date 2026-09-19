import { describe, expect, it } from "vitest";
import {
  FEED_ROUND_REVIEW_LOCATION_REQUIRED_MESSAGE,
  isUsableRoundReviewLocation,
  locationFromSelectedGolfCourse,
  resolveFeedRoundReviewLocation,
} from "./feedRoundReviewLocation";

describe("isUsableRoundReviewLocation", () => {
  it("rejects empty and too-short values", () => {
    expect(isUsableRoundReviewLocation("")).toBe(false);
    expect(isUsableRoundReviewLocation(" ")).toBe(false);
    expect(isUsableRoundReviewLocation("A")).toBe(false);
  });

  it("accepts real locations", () => {
    expect(isUsableRoundReviewLocation("West Palm Beach, Florida")).toBe(true);
    expect(isUsableRoundReviewLocation("NY")).toBe(true);
  });
});

describe("locationFromSelectedGolfCourse", () => {
  it("formats city/region/country from directory data", () => {
    expect(
      locationFromSelectedGolfCourse({
        city: "Pinehurst",
        region: "North Carolina",
        country: "United States",
      }),
    ).toBe("Pinehurst, North Carolina, United States");
  });

  it("returns empty when the course has no location parts", () => {
    expect(locationFromSelectedGolfCourse({ city: null, region: null, country: null })).toBe("");
  });
});

describe("resolveFeedRoundReviewLocation", () => {
  it("uses selected course location when usable → create can proceed", () => {
    const result = resolveFeedRoundReviewLocation({
      selectedCourseLocation: "Scottsdale, Arizona, United States",
      manualLocation: "",
    });

    expect(result).toEqual({
      ok: true,
      location: "Scottsdale, Arizona, United States",
    });
  });

  it("prefers selected course location over a different manual value", () => {
    const result = resolveFeedRoundReviewLocation({
      selectedCourseLocation: "Bandon, Oregon, United States",
      manualLocation: "Somewhere else",
    });

    expect(result).toEqual({
      ok: true,
      location: "Bandon, Oregon, United States",
    });
  });

  it("falls back to manual location when selected course has none", () => {
    const result = resolveFeedRoundReviewLocation({
      selectedCourseLocation: "",
      manualLocation: "West Palm Beach, FL",
    });

    expect(result).toEqual({
      ok: true,
      location: "West Palm Beach, FL",
    });
  });

  it("blocks client-side with a clear error when location is missing", () => {
    const result = resolveFeedRoundReviewLocation({
      selectedCourseLocation: "",
      manualLocation: "",
    });

    expect(result).toEqual({
      ok: false,
      message: FEED_ROUND_REVIEW_LOCATION_REQUIRED_MESSAGE,
    });
  });

  it("blocks when selected course location is unusable and manual is empty", () => {
    const result = resolveFeedRoundReviewLocation({
      selectedCourseLocation: " ",
      manualLocation: "X",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe(FEED_ROUND_REVIEW_LOCATION_REQUIRED_MESSAGE);
    }
  });
});
