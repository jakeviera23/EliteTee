import { beforeEach, describe, expect, it, vi } from "vitest";

const { findOrCreateMemberGolfCourse } = vi.hoisted(() => ({
  findOrCreateMemberGolfCourse: vi.fn(),
}));

const { getCurrentAuthUserId } = vi.hoisted(() => ({
  getCurrentAuthUserId: vi.fn(),
}));

const insertMock = vi.fn();
const selectMock = vi.fn();
const singleMock = vi.fn();

vi.mock("./golfCourses", () => ({
  findOrCreateMemberGolfCourse,
}));

vi.mock("./authUserLinking", () => ({
  getCurrentAuthUserId,
}));

vi.mock("./supabase", () => ({
  supabase: {
    from: () => ({
      insert: insertMock.mockReturnValue({
        select: selectMock.mockReturnValue({
          single: singleMock,
        }),
      }),
    }),
  },
}));

import { submitMemberCourseRound } from "./memberCourseRounds";

describe("submitMemberCourseRound", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("links to an existing curated course id when provided", async () => {
    getCurrentAuthUserId.mockResolvedValue({ userId: "u1", error: null });

    singleMock.mockResolvedValueOnce({ data: { id: "round-1" }, error: null });

    const { data, error } = await submitMemberCourseRound({
      course_name: "Pine Valley Golf Club",
      location: "Pine Valley, New Jersey, United States",
      played_on: "2026-07-13",
      note: "",
      would_play_again: true,
      course_rating: 9,
      golf_course_id: "curated-course-id",
    });

    expect(error).toBeNull();
    expect(data?.golf_course_id).toBe("curated-course-id");
    expect(findOrCreateMemberGolfCourse).not.toHaveBeenCalled();
    expect(insertMock).toHaveBeenCalled();
  });

  it("sanitizes ambiguous slug error from course linking", async () => {
    getCurrentAuthUserId.mockResolvedValue({ userId: "u1", error: null });

    findOrCreateMemberGolfCourse.mockResolvedValue({
      data: null,
      error: new Error('column reference \"slug\" is ambiguous'),
    });

    const { data, error } = await submitMemberCourseRound({
      course_name: "Some Course",
      location: "Somewhere",
      played_on: "2026-07-13",
      note: "",
      would_play_again: true,
      course_rating: 8,
      golf_course_id: null,
    });

    expect(data).toBeNull();
    expect(error?.message).toMatch(/course-linking error/i);
  });
});

