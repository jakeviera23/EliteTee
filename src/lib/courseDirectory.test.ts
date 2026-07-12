import { describe, expect, it } from "vitest";
import type { GolfCourseSearchResult } from "../types/golfCourse";
import {
  filterCourses,
  groupCoursesGeographically,
  normalizeCountry,
  normalizeRegion,
  sortCourses,
  UNSPECIFIED_COUNTRY,
  UNSPECIFIED_REGION,
} from "./courseDirectory";

function course(
  overrides: Partial<GolfCourseSearchResult> & Pick<GolfCourseSearchResult, "id" | "name" | "slug">,
): GolfCourseSearchResult {
  return {
    city: null,
    region: null,
    country: null,
    round_count: 0,
    member_count: 0,
    recommend_pct: null,
    avg_rating: null,
    latest_activity_at: null,
    ...overrides,
  };
}

describe("groupCoursesGeographically", () => {
  it("groups by country and region from stored fields", () => {
    const groups = groupCoursesGeographically([
      course({ id: "1", name: "A", slug: "a", country: "United States", region: "New York" }),
      course({ id: "2", name: "B", slug: "b", country: "United States", region: "Florida" }),
      course({ id: "3", name: "C", slug: "c", country: "Scotland", region: "Fife" }),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]?.country).toBe("Scotland");
    expect(groups[1]?.country).toBe("United States");
    expect(groups[1]?.regions.map((group) => group.region)).toEqual(["Florida", "New York"]);
  });

  it("places missing region data under Region not specified", () => {
    const groups = groupCoursesGeographically([
      course({ id: "1", name: "A", slug: "a", country: "Australia", region: null }),
    ]);

    expect(groups[0]?.regions[0]?.region).toBe(UNSPECIFIED_REGION);
  });

  it("places missing country data under Country not specified", () => {
    expect(normalizeCountry(null)).toBe(UNSPECIFIED_COUNTRY);
    expect(normalizeRegion(undefined)).toBe(UNSPECIFIED_REGION);
  });
});

describe("sortCourses", () => {
  it("sorts highest rated with one-decimal averages", () => {
    const sorted = sortCourses(
      [
        course({ id: "1", name: "A", slug: "a", avg_rating: 9.4, round_count: 2 }),
        course({ id: "2", name: "B", slug: "b", avg_rating: 9.0, round_count: 3 }),
      ],
      "highest-rated",
    );

    expect(sorted[0]?.id).toBe("1");
  });
});

describe("filterCourses", () => {
  it("filters by country and city", () => {
    const filtered = filterCourses(
      [
        course({
          id: "1",
          name: "A",
          slug: "a",
          country: "United States",
          region: "Florida",
          city: "Palm Beach",
        }),
        course({
          id: "2",
          name: "B",
          slug: "b",
          country: "Scotland",
          region: "Fife",
          city: "St Andrews",
        }),
      ],
      { country: "United States", region: "", city: "Palm Beach", courseType: "", accessType: "" },
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("1");
  });

  it("finds courses by city/state/country after region metadata is added", () => {
    const before = course({
      id: "legacy-1",
      name: "Southampton Golf Club",
      slug: "southampton-golf-club",
      city: "Southampton",
      region: null,
      country: null,
    });
    const after = course({
      ...before,
      region: "NY",
      country: "United States",
    });

    expect(groupCoursesGeographically([before])[0]?.regions[0]?.region).toBe(UNSPECIFIED_REGION);
    expect(groupCoursesGeographically([after])[0]?.regions[0]?.region).toBe("NY");

    const filtered = filterCourses([after], {
      country: "United States",
      region: "NY",
      city: "Southampton",
      courseType: "",
      accessType: "",
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("legacy-1");
  });
});
