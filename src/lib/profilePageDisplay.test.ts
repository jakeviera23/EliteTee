import { describe, expect, it } from "vitest";
import type { MemberCourseRoundRecord } from "../types/memberCourseRound";
import {
  buildProfileExperienceStats,
  buildUniqueCoursesPlayed,
} from "./profilePageDisplay";

function round(
  overrides: Partial<MemberCourseRoundRecord> & Pick<MemberCourseRoundRecord, "id">,
): MemberCourseRoundRecord {
  return {
    member_user_id: "member-1",
    course_name: "Test Course",
    location: "City, Region",
    played_on: "2026-01-15",
    note: "",
    would_play_again: true,
    course_rating: 8.5,
    created_at: "",
    ...overrides,
  };
}

describe("buildUniqueCoursesPlayed", () => {
  it("dedupes by golf course id and aggregates rounds", () => {
    const summaries = buildUniqueCoursesPlayed([
      round({
        id: "1",
        golf_course_id: "course-a",
        course_slug: "test-course",
        played_on: "2026-02-01",
        course_rating: 9.0,
      }),
      round({
        id: "2",
        golf_course_id: "course-a",
        played_on: "2026-01-01",
        course_rating: 8.0,
      }),
    ]);

    expect(summaries).toHaveLength(1);
    expect(summaries[0]?.roundCount).toBe(2);
    expect(summaries[0]?.courseSlug).toBe("test-course");
    expect(summaries[0]?.avgRating).toBe(8.5);
  });
});

describe("buildProfileExperienceStats", () => {
  it("counts unique courses and feed posts", () => {
    const stats = buildProfileExperienceStats(
      [
        round({ id: "1", golf_course_id: "a" }),
        round({ id: "2", golf_course_id: "b" }),
      ],
      3,
    );

    expect(stats).toEqual({
      roundsShared: 2,
      coursesPlayed: 2,
      feedPosts: 3,
      connections: 0,
    });
  });
});
