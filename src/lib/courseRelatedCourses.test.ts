import { describe, expect, it } from "vitest";
import type { GolfCourseSearchResult } from "../types/golfCourse";
import { pickRelatedCourses, scoreRelatedCourse } from "./courseRelatedCourses";

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

describe("scoreRelatedCourse", () => {
  const current = course({
    id: "current",
    name: "Current",
    slug: "current",
    country: "United States",
    region: "Florida",
    course_type: "Links",
    access_type: "Private",
    avg_rating: 9.2,
  });

  it("excludes the current course", () => {
    expect(scoreRelatedCourse(current, current)).toBe(-1);
  });

  it("scores country, region, type, access, and rating proximity", () => {
    const match = course({
      id: "match",
      name: "Match",
      slug: "match",
      country: "United States",
      region: "Florida",
      course_type: "Links",
      access_type: "Private",
      avg_rating: 9.0,
      round_count: 3,
    });

    expect(scoreRelatedCourse(current, match)).toBeGreaterThan(10);
  });
});

describe("pickRelatedCourses", () => {
  it("returns deterministic ranked matches and excludes the current course", () => {
    const current = course({
      id: "current",
      name: "Current",
      slug: "current",
      country: "Scotland",
      region: "Fife",
      course_type: "Links",
      access_type: "Private",
      avg_rating: 8.8,
    });

    const related = pickRelatedCourses(current, [
      current,
      course({
        id: "1",
        name: "A",
        slug: "a",
        country: "Scotland",
        region: "Fife",
        course_type: "Links",
        access_type: "Private",
        avg_rating: 8.5,
        round_count: 5,
      }),
      course({
        id: "2",
        name: "B",
        slug: "b",
        country: "United States",
        region: "California",
        course_type: "Parkland",
        access_type: "Public",
        avg_rating: 7.0,
        round_count: 2,
      }),
    ]);

    expect(related.map((entry) => entry.id)).toEqual(["1"]);
  });
});
