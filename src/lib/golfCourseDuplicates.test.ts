import { describe, expect, it } from "vitest";
import {
  findGolfCourseDuplicateCandidatesLocal,
  normalizeGolfCourseNameForMatch,
} from "./golfCourseDuplicates";

describe("normalizeGolfCourseNameForMatch", () => {
  it("lowercases, trims, and collapses whitespace", () => {
    expect(normalizeGolfCourseNameForMatch("  Pebble   Beach  ")).toBe("pebble beach");
  });
});

describe("findGolfCourseDuplicateCandidatesLocal", () => {
  const existing = [
    {
      id: "course-external",
      external_id: "provider-123",
      name: "Pebble Beach Golf Links",
      city: "Pebble Beach",
      country: "United States",
      normalized_name: "pebble beach golf links",
    },
    {
      id: "course-name-city",
      external_id: null,
      name: "Bandon Dunes",
      city: "Bandon",
      country: "United States",
      normalized_name: "bandon dunes",
    },
    {
      id: "course-name-country",
      external_id: null,
      name: "Royal County Down",
      city: "Newcastle",
      country: "United Kingdom",
      normalized_name: "royal county down",
    },
  ];

  it("matches external_id first", () => {
    const matches = findGolfCourseDuplicateCandidatesLocal(
      {
        external_id: "provider-123",
        name: "Different Name",
        city: "Elsewhere",
        country: "Canada",
      },
      existing,
    );

    expect(matches).toEqual([
      {
        golf_course_id: "course-external",
        match_reason: "external_id",
        match_rank: 1,
      },
    ]);
  });

  it("matches normalized name with city and country", () => {
    const matches = findGolfCourseDuplicateCandidatesLocal(
      {
        name: "Bandon   Dunes",
        city: "Bandon",
        country: "United States",
      },
      existing,
    );

    expect(matches[0]).toMatchObject({
      golf_course_id: "course-name-city",
      match_reason: "normalized_name_city_country",
      match_rank: 2,
    });
  });

  it("falls back to normalized name and country when city differs", () => {
    const matches = findGolfCourseDuplicateCandidatesLocal(
      {
        name: "Royal County Down",
        city: "Dublin",
        country: "United Kingdom",
      },
      existing,
    );

    expect(matches[0]).toMatchObject({
      golf_course_id: "course-name-country",
      match_reason: "normalized_name_country",
      match_rank: 3,
    });
  });

  it("excludes a course id when requested", () => {
    const matches = findGolfCourseDuplicateCandidatesLocal(
      {
        external_id: "provider-123",
        name: "Pebble Beach Golf Links",
        city: "Pebble Beach",
        country: "United States",
      },
      existing,
      { excludeCourseId: "course-external" },
    );

    expect(matches).toEqual([]);
  });
});
