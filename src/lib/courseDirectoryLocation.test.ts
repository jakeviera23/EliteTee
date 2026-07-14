import { describe, expect, it } from "vitest";
import type { GolfCourseSearchResult } from "../types/golfCourse";
import {
  buildCoursesLocationPath,
  buildCoursesLocationSearchParams,
  buildLocationBrowseCountries,
  buildLocationBrowseRegions,
  courseMatchesSelectedLocation,
  filterCoursesForSelectedLocation,
  getLocationBrowseStep,
  getLocationRegionCourseCount,
  getLocationSearchQuery,
  parseCoursesLocationSearchParams,
  shouldShowLocationEmptyState,
} from "./courseDirectoryLocation";

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

describe("parseCoursesLocationSearchParams", () => {
  it("restores country and region from URL query params", () => {
    const params = new URLSearchParams("country=United%20States&region=New%20York");
    expect(parseCoursesLocationSearchParams(params)).toEqual({
      country: "United States",
      region: "New York",
      viewAll: false,
    });
  });

  it("restores view all mode", () => {
    const params = new URLSearchParams("view=all");
    expect(parseCoursesLocationSearchParams(params)).toEqual({
      country: "",
      region: "",
      viewAll: true,
    });
  });
});

describe("buildCoursesLocationPath", () => {
  it("builds a shareable courses location URL", () => {
    expect(
      buildCoursesLocationPath({
        country: "United States",
        region: "New York",
        viewAll: false,
      }),
    ).toBe("/courses?country=United+States&region=New+York");
  });

  it("builds a clear-location courses URL", () => {
    expect(
      buildCoursesLocationPath({
        country: "",
        region: "",
        viewAll: false,
      }),
    ).toBe("/courses");
  });
});

describe("getLocationBrowseStep", () => {
  it("selects country browsing by default", () => {
    expect(
      getLocationBrowseStep({ country: "", region: "", viewAll: false }),
    ).toBe("countries");
  });

  it("selects region browsing after country selection", () => {
    expect(
      getLocationBrowseStep({
        country: "United States",
        region: "",
        viewAll: false,
      }),
    ).toBe("regions");
  });

  it("selects course results after region selection", () => {
    expect(
      getLocationBrowseStep({
        country: "United States",
        region: "New York",
        viewAll: false,
      }),
    ).toBe("courses");
  });
});

describe("buildLocationBrowseCountries", () => {
  it("aggregates accurate server-side country totals", () => {
    const countries = buildLocationBrowseCountries([
      { country: "United States", region: "New York", course_count: 12 },
      { country: "United States", region: "NY", course_count: 3 },
      { country: "Scotland", region: "Fife", course_count: 8 },
    ]);

    expect(countries).toEqual([
      { country: "Scotland", courseCount: 8 },
      { country: "United States", courseCount: 15 },
    ]);
  });
});

describe("buildLocationBrowseRegions", () => {
  it("combines NY and New York into one canonical region count", () => {
    const regions = buildLocationBrowseRegions(
      [
        { country: "United States", region: "New York", course_count: 12 },
        { country: "United States", region: "NY", course_count: 3 },
        { country: "United States", region: "Florida", course_count: 20 },
      ],
      "United States",
    );

    expect(regions).toEqual([
      { region: "Florida", courseCount: 20 },
      { region: "New York", courseCount: 15 },
    ]);
  });

  it("combines NJ and New Jersey into one canonical region count", () => {
    const regions = buildLocationBrowseRegions(
      [
        { country: "United States", region: "NJ", course_count: 4 },
        { country: "United States", region: "New Jersey", course_count: 6 },
      ],
      "United States",
    );

    expect(regions).toEqual([{ region: "New Jersey", courseCount: 10 }]);
  });
});

describe("getLocationRegionCourseCount", () => {
  it("returns the merged canonical region total", () => {
    expect(
      getLocationRegionCourseCount(
        [
          { country: "United States", region: "New York", course_count: 12 },
          { country: "United States", region: "NY", course_count: 3 },
        ],
        "United States",
        "New York",
      ),
    ).toBe(15);
  });
});

describe("getLocationSearchQuery", () => {
  it("uses the US state search token for United States → New York", () => {
    expect(getLocationSearchQuery("United States", "New York")).toBe("NY");
  });

  it("uses the region only for Bermuda → Bermuda", () => {
    expect(getLocationSearchQuery("Bermuda", "Bermuda")).toBe("Bermuda");
  });

  it("uses the region only for Bermuda → Hamilton Parish", () => {
    expect(getLocationSearchQuery("Bermuda", "Hamilton Parish")).toBe("Hamilton Parish");
  });

  it("falls back to country when region is unspecified", () => {
    expect(getLocationSearchQuery("Bermuda", "Region not specified")).toBe("Bermuda");
  });
});

describe("courseMatchesSelectedLocation", () => {
  it("matches United States → New York against stored NY rows", () => {
    const location = {
      country: "United States",
      region: "New York",
      viewAll: false,
    };

    expect(
      courseMatchesSelectedLocation(
        course({
          id: "1",
          name: "Shinnecock Hills Golf Club",
          slug: "shinnecock",
          country: "United States",
          region: "NY",
        }),
        location,
      ),
    ).toBe(true);
  });

  it("matches Bermuda region rows without requiring a combined query", () => {
    const location = {
      country: "Bermuda",
      region: "Bermuda",
      viewAll: false,
    };

    expect(
      courseMatchesSelectedLocation(
        course({
          id: "1",
          name: "Port Royal Golf Course",
          slug: "port-royal",
          country: "Bermuda",
          region: "Bermuda",
        }),
        location,
      ),
    ).toBe(true);

    expect(
      courseMatchesSelectedLocation(
        course({
          id: "2",
          name: "Mid Ocean Club",
          slug: "mid-ocean",
          country: "Bermuda",
          region: "Hamilton Parish",
        }),
        location,
      ),
    ).toBe(false);
  });
});

describe("filterCoursesForSelectedLocation", () => {
  it("keeps all 15 United States → New York rows when RPC returns NY and New York", () => {
    const rows = [
      course({
        id: "1",
        name: "A",
        slug: "a",
        country: "United States",
        region: "NY",
      }),
      course({
        id: "2",
        name: "B",
        slug: "b",
        country: "United States",
        region: "New York",
      }),
      course({
        id: "3",
        name: "C",
        slug: "c",
        country: "Canada",
        region: "Ontario",
      }),
    ];

    const filtered = filterCoursesForSelectedLocation(rows, {
      country: "United States",
      region: "New York",
      viewAll: false,
    });

    expect(filtered.map((row) => row.id)).toEqual(["1", "2"]);
  });
});

describe("shouldShowLocationEmptyState", () => {
  it("does not show a false empty state while location results are loading", () => {
    expect(
      shouldShowLocationEmptyState({
        workingSetLength: 0,
        isLoading: true,
        isPaging: false,
        showLocationResults: true,
      }),
    ).toBe(false);
  });

  it("does not show empty when server count is positive and rows are loaded", () => {
    expect(
      shouldShowLocationEmptyState({
        workingSetLength: 15,
        isLoading: false,
        isPaging: false,
        showLocationResults: true,
      }),
    ).toBe(false);
  });
});

describe("parseCoursesLocationSearchParams URL changes", () => {
  it("resets to a new region when URL params change", () => {
    const first = parseCoursesLocationSearchParams(
      new URLSearchParams("country=United%20States&region=Florida"),
    );
    const second = parseCoursesLocationSearchParams(
      new URLSearchParams("country=United%20States&region=New%20York"),
    );

    expect(first.region).toBe("Florida");
    expect(second.region).toBe("New York");
    expect(getLocationBrowseStep(second)).toBe("courses");
    expect(getLocationSearchQuery(second.country, second.region)).toBe("NY");
  });
});

describe("buildCoursesLocationSearchParams", () => {
  it("clears location filters when returning to country browse", () => {
    const params = buildCoursesLocationSearchParams({
      country: "United States",
      region: "",
      viewAll: false,
    });

    expect(params.get("country")).toBe("United States");
    expect(params.get("region")).toBeNull();
    expect(params.get("view")).toBeNull();
  });
});
