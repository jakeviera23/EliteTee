import { describe, expect, it } from "vitest";
import type { MemberCourseRoundRecord } from "../types/memberCourseRound";
import {
  buildProfileExperienceStats,
  buildUniqueCoursesPlayed,
  shouldTruncateProfileExperienceNote,
  truncateProfileExperienceNote,
  truncateProfileFeedExcerpt,
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

describe("truncateProfileFeedExcerpt", () => {
  it("shortens long feed captions for profile summaries", () => {
    const excerpt = truncateProfileFeedExcerpt("A".repeat(180), 40);
    expect(excerpt.endsWith("…")).toBe(true);
  });
});

describe("shouldTruncateProfileExperienceNote", () => {
  it("flags multi-line and long review notes", () => {
    expect(shouldTruncateProfileExperienceNote("Short review.")).toBe(false);
    expect(shouldTruncateProfileExperienceNote("Line one\nLine two\nLine three\nLine four")).toBe(
      true,
    );
  });
});

describe("truncateProfileExperienceNote", () => {
  it("returns the full note when it fits the preview length", () => {
    expect(truncateProfileExperienceNote("Great routing and fast greens.")).toEqual({
      preview: "Great routing and fast greens.",
      isTruncated: false,
    });
  });

  it("truncates long reviews with an ellipsis", () => {
    const note = "A".repeat(200);
    const result = truncateProfileExperienceNote(note, 40);

    expect(result.isTruncated).toBe(true);
    expect(result.preview.endsWith("…")).toBe(true);
    expect(result.preview.length).toBeLessThan(note.length);
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
