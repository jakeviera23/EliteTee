import { describe, expect, it } from "vitest";
import {
  buildCourseCardActivitySummary,
  buildCourseClassificationPills,
  buildCourseLocationClassificationFacts,
  formatCourseDisplayLocation,
  formatPlayedRoundReviewMeta,
  hasCourseMemberActivity,
  isMeaningfulBrowseCountry,
  isMeaningfulBrowseRegion,
  isMeaningfulCourseText,
  splitDestinationsForPreview,
} from "./courseDisplay";

describe("isMeaningfulCourseText", () => {
  it("filters course placeholder values", () => {
    expect(isMeaningfulCourseText("Location not set")).toBe(false);
    expect(isMeaningfulCourseText("Country not specified")).toBe(false);
    expect(isMeaningfulCourseText("Not specified")).toBe(false);
    expect(isMeaningfulCourseText("Other")).toBe(false);
  });

  it("keeps meaningful course values", () => {
    expect(isMeaningfulCourseText("Augusta")).toBe(true);
    expect(isMeaningfulCourseText("United States")).toBe(true);
    expect(isMeaningfulCourseText("private")).toBe(true);
  });
});

describe("isMeaningfulBrowseCountry", () => {
  it("hides unspecified and other browse countries", () => {
    expect(isMeaningfulBrowseCountry("Country not specified")).toBe(false);
    expect(isMeaningfulBrowseCountry("Other")).toBe(false);
    expect(isMeaningfulBrowseCountry("United States")).toBe(true);
  });
});

describe("isMeaningfulBrowseRegion", () => {
  it("hides unspecified browse regions", () => {
    expect(isMeaningfulBrowseRegion("Region not specified")).toBe(false);
    expect(isMeaningfulBrowseRegion("Other")).toBe(false);
    expect(isMeaningfulBrowseRegion("Georgia")).toBe(true);
  });
});

describe("formatPlayedRoundReviewMeta", () => {
  it("omits placeholder round locations from review metadata", () => {
    expect(formatPlayedRoundReviewMeta("Jun 10, 2026", "Location not set")).toBe(
      "Played Jun 10, 2026",
    );
    expect(formatPlayedRoundReviewMeta("Jun 10, 2026", "Not specified")).toBe(
      "Played Jun 10, 2026",
    );
    expect(formatPlayedRoundReviewMeta("Jun 10, 2026", "Other")).toBe("Played Jun 10, 2026");
    expect(formatPlayedRoundReviewMeta("Jun 10, 2026", "")).toBe("Played Jun 10, 2026");
  });

  it("includes meaningful round locations in review metadata", () => {
    expect(formatPlayedRoundReviewMeta("Jun 10, 2026", "Southampton NY")).toBe(
      "Played Jun 10, 2026 · Southampton NY",
    );
  });
});

describe("formatCourseDisplayLocation", () => {
  it("renders city, region, and country without placeholders", () => {
    expect(
      formatCourseDisplayLocation({
        city: "Bridgehampton",
        region: "NY",
        country: "United States",
      }),
    ).toBe("Bridgehampton, New York, United States");
  });

  it("drops placeholder regions like Other", () => {
    expect(
      formatCourseDisplayLocation({
        city: "Visby",
        region: "Gotland",
        country: "Other",
      }),
    ).toBe("Visby, Gotland");
  });

  it("returns null when only placeholder values exist", () => {
    expect(
      formatCourseDisplayLocation({
        city: "Location not set",
        region: null,
        country: null,
      }),
    ).toBeNull();
  });
});

describe("buildCourseCardActivitySummary", () => {
  it("builds a compact activity summary for populated courses", () => {
    expect(
      buildCourseCardActivitySummary({
        avgRating: 9.4,
        roundCount: 1,
        memberCount: 1,
        recommendPct: 100,
      }),
    ).toEqual(["9.4", "1 member experience", "100% would play again"]);
  });

  it("returns an empty summary when there is no member activity", () => {
    expect(
      buildCourseCardActivitySummary({
        avgRating: null,
        roundCount: 0,
        memberCount: 0,
        recommendPct: null,
      }),
    ).toEqual([]);
  });
});

describe("hasCourseMemberActivity", () => {
  it("detects populated and empty member activity states", () => {
    expect(hasCourseMemberActivity(0, 0)).toBe(false);
    expect(hasCourseMemberActivity(1, 0)).toBe(true);
    expect(hasCourseMemberActivity(0, 2)).toBe(true);
  });
});

describe("buildCourseClassificationPills", () => {
  it("hides placeholder classification values", () => {
    expect(
      buildCourseClassificationPills({
        course_type: "Not specified",
        access_type: "private",
      }),
    ).toEqual(["private"]);
  });
});

describe("buildCourseLocationClassificationFacts", () => {
  it("only includes meaningful sidebar rows", () => {
    expect(
      buildCourseLocationClassificationFacts({
        city: "Augusta",
        region: "Georgia",
        country: "United States",
        course_type: "parkland",
        access_type: "private",
      }),
    ).toEqual([
      { label: "City", value: "Augusta" },
      { label: "Region", value: "Georgia" },
      { label: "Country", value: "United States" },
      { label: "Course type", value: "parkland" },
      { label: "Access", value: "private" },
    ]);
  });

  it("omits empty classification rows", () => {
    expect(
      buildCourseLocationClassificationFacts({
        city: null,
        region: null,
        country: null,
        course_type: "Not specified",
        access_type: "Not specified",
      }),
    ).toEqual([]);
  });
});

describe("splitDestinationsForPreview", () => {
  it("returns the largest destinations first with a hasMore flag", () => {
    const destinations = [
      { country: "Ireland", courseCount: 4 },
      { country: "United States", courseCount: 40 },
      { country: "Canada", courseCount: 12 },
      { country: "Australia", courseCount: 8 },
    ];

    const { preview, hasMore } = splitDestinationsForPreview(destinations, 2);

    expect(hasMore).toBe(true);
    expect(preview.map((entry) => entry.country)).toEqual(["United States", "Canada"]);
  });
});
