import { beforeEach, describe, expect, it, vi } from "vitest";

const { updateOwnBucketListCourseIds, fetchOwnMemberProfile } = vi.hoisted(() => ({
  updateOwnBucketListCourseIds: vi.fn(),
  fetchOwnMemberProfile: vi.fn(),
}));

vi.mock("./memberProfiles", () => ({
  fetchOwnMemberProfile,
  updateOwnBucketListCourseIds,
}));

import {
  ensureBucketListHydrated,
  getBucketListCourseIds,
  hydrateBucketListCourseIds,
  isCourseOnBucketList,
  resetBucketListStateForTests,
  toggleBucketListCourse,
} from "./portalCourseState";

describe("portalCourseState bucket list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetBucketListStateForTests();
    fetchOwnMemberProfile.mockResolvedValue({
      data: { bucket_list_course_ids: ["course-a", "course-b"] },
      error: null,
    });
    updateOwnBucketListCourseIds.mockResolvedValue({
      data: ["course-a", "course-b", "course-c"],
      error: null,
    });
  });

  it("hydrates bucket list ids from the member profile", async () => {
    await ensureBucketListHydrated();

    expect(fetchOwnMemberProfile).toHaveBeenCalledTimes(1);
    expect(getBucketListCourseIds()).toEqual(["course-a", "course-b"]);
    expect(isCourseOnBucketList("course-b")).toBe(true);
  });

  it("adds a course to the bucket list and persists to Supabase", async () => {
    hydrateBucketListCourseIds(["course-a"]);

    const result = await toggleBucketListCourse("course-c");

    expect(updateOwnBucketListCourseIds).toHaveBeenCalledWith(["course-a", "course-c"]);
    expect(result).toEqual({ isOnBucketList: true, error: null });
    expect(isCourseOnBucketList("course-c")).toBe(true);
  });

  it("returns the previous state when persistence fails", async () => {
    hydrateBucketListCourseIds(["course-a"]);
    updateOwnBucketListCourseIds.mockResolvedValueOnce({
      data: null,
      error: new Error("save failed"),
    });

    const result = await toggleBucketListCourse("course-b");

    expect(result.isOnBucketList).toBe(false);
    expect(result.error?.message).toBe("save failed");
    expect(getBucketListCourseIds()).toEqual(["course-a"]);
  });
});
