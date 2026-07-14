import { describe, expect, it } from "vitest";
import type { GolfCourseSearchResult } from "../types/golfCourse";
import {
  applyGeoCountsToGroups,
  dedupeCoursesForDirectory,
  filterCourses,
  groupCoursesGeographically,
  normalizeCountry,
  normalizeRegion,
  sortCourses,
  sortCoursesByLocationActivity,
  buildFeaturedSections,
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
    expect(groupCoursesGeographically([after])[0]?.regions[0]?.region).toBe("New York");

    const filtered = filterCourses([after], {
      country: "United States",
      region: "New York",
      city: "Southampton",
      courseType: "",
      accessType: "",
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("legacy-1");
  });
});

describe("sortCoursesByLocationActivity", () => {
  it("orders by rounds, latest activity, then name", () => {
    const sorted = sortCoursesByLocationActivity([
      course({
        id: "1",
        name: "Zeta",
        slug: "zeta",
        round_count: 1,
        latest_activity_at: "2026-01-01T00:00:00.000Z",
      }),
      course({
        id: "2",
        name: "Alpha",
        slug: "alpha",
        round_count: 2,
        latest_activity_at: "2026-02-01T00:00:00.000Z",
      }),
      course({
        id: "3",
        name: "Beta",
        slug: "beta",
        round_count: 1,
        latest_activity_at: "2026-03-01T00:00:00.000Z",
      }),
    ]);

    expect(sorted.map((entry) => entry.id)).toEqual(["2", "3", "1"]);
  });
});

describe("applyGeoCountsToGroups", () => {
  it("applies server-side totals without changing loaded cards", () => {
    const groups = groupCoursesGeographically([
      course({
        id: "1",
        name: "National Golf Links of America",
        slug: "ngla",
        country: "United States",
        region: "New York",
        round_count: 1,
      }),
    ]);

    const withCounts = applyGeoCountsToGroups(groups, [
      { country: "United States", region: "New York", course_count: 12 },
      { country: "United States", region: "NY", course_count: 4 },
    ]);

    expect(withCounts[0]?.regions[0]?.courses).toHaveLength(1);
    expect(withCounts[0]?.regions[0]?.totalCourseCount).toBe(16);
    expect(withCounts[0]?.courseCount).toBe(16);
  });
});

describe("dedupeCoursesForDirectory", () => {
  it("keeps the reviewed row when duplicate cards share identity", () => {
    const deduped = dedupeCoursesForDirectory([
      course({
        id: "curated",
        name: "Bandon Trails",
        slug: "bandon-dunes-golf-resort-bandon-trails",
        city: "Bandon",
        region: "Oregon",
        country: "United States",
        round_count: 0,
      }),
      course({
        id: "reviewed",
        name: "Bandon Trails",
        slug: "bandon-trails-bandon",
        city: "Bandon",
        region: "Oregon",
        country: "United States",
        round_count: 1,
        avg_rating: 9.5,
      }),
    ]);

    expect(deduped).toHaveLength(1);
    expect(deduped[0]?.id).toBe("reviewed");
  });
});

describe("buildFeaturedSections", () => {
  it("limits each category independently without cross-category dedupe", () => {
    const shared = course({
      id: "shared",
      name: "Shared Course",
      slug: "shared",
      round_count: 3,
      avg_rating: 9.5,
      latest_activity_at: "2026-03-01T00:00:00.000Z",
    });

    const featured = buildFeaturedSections({
      popular: [shared],
      pool: [shared],
      limit: 6,
    });

    expect(featured.popular).toHaveLength(1);
    expect(featured.highestRated).toHaveLength(1);
    expect(featured.recentlyReviewed).toHaveLength(1);
    expect(featured.popular[0]?.id).toBe("shared");
  });

  it("does not duplicate courses within a single category", () => {
    const duplicate = course({
      id: "dup",
      name: "Duplicate",
      slug: "dup",
      round_count: 2,
      avg_rating: 9,
      latest_activity_at: "2026-03-01T00:00:00.000Z",
    });

    const featured = buildFeaturedSections({
      popular: [duplicate, duplicate],
      pool: [],
      limit: 6,
    });

    expect(featured.popular).toHaveLength(1);
  });
});
