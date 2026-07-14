import { describe, expect, it } from "vitest";
import {
  buildCourseDirectoryAnswer,
  buildNoCourseDirectoryResultsAnswer,
  filterCoursesByDirectoryFilters,
} from "./course-directory-answer.ts";
import type { RetrievedCourse } from "./types.ts";

const sampleCourses: RetrievedCourse[] = [
  {
    id: "course-1",
    name: "National Golf Links",
    slug: "national-golf-links",
    city: "Southampton",
    region: "New York",
    country: "United States",
    course_type: "Links",
    access_type: "Private",
    description: null,
    round_count: 0,
    member_count: 0,
    recommend_pct: null,
    avg_rating: null,
    latest_activity_at: null,
  },
  {
    id: "course-2",
    name: "Shinnecock Hills",
    slug: "shinnecock-hills",
    city: "Southampton",
    region: "New York",
    country: "United States",
    course_type: "Parkland",
    access_type: "Private",
    description: null,
    round_count: 2,
    member_count: 1,
    recommend_pct: 100,
    avg_rating: 4.5,
    latest_activity_at: "2026-07-01T00:00:00.000Z",
  },
];

describe("buildCourseDirectoryAnswer", () => {
  it("returns a concise directory answer for New York", () => {
    const answer = buildCourseDirectoryAnswer(sampleCourses, {
      locationQuery: "New York",
      accessType: null,
      courseType: null,
    });

    expect(answer).toContain("EliteTee currently has 2 courses in New York.");
    expect(answer).toContain("National Golf Links");
    expect(answer).toContain("Shinnecock Hills");
  });

  it("notes when member review data is still limited", () => {
    const answer = buildCourseDirectoryAnswer([sampleCourses[0]!], {
      locationQuery: "New York",
      accessType: null,
      courseType: null,
    });

    expect(answer).toContain("Member review data is still limited.");
  });

  it("keeps directory facts separate from invented review claims", () => {
    const answer = buildCourseDirectoryAnswer([sampleCourses[0]!], {
      locationQuery: "New York",
      accessType: null,
      courseType: null,
    });

    expect(answer).not.toContain("highly rated");
    expect(answer).not.toContain("members recommend");
  });
});

describe("filterCoursesByDirectoryFilters", () => {
  it("filters private courses in Florida-style questions", () => {
    const filtered = filterCoursesByDirectoryFilters(sampleCourses, {
      locationQuery: "New York",
      accessType: "private",
      courseType: null,
    });

    expect(filtered).toHaveLength(2);
  });

  it("returns no matches when access filters exclude all courses", () => {
    const filtered = filterCoursesByDirectoryFilters(sampleCourses, {
      locationQuery: "New York",
      accessType: "public",
      courseType: null,
    });

    expect(filtered).toHaveLength(0);
  });
});

describe("buildNoCourseDirectoryResultsAnswer", () => {
  it("returns a genuine no-results response for empty locations", () => {
    expect(buildNoCourseDirectoryResultsAnswer("Wyoming")).toBe(
      "EliteTee does not currently list any courses in Wyoming.",
    );
  });
});
