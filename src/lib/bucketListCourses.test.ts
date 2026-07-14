import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchGolfCoursesByIds } = vi.hoisted(() => ({
  fetchGolfCoursesByIds: vi.fn(),
}));

vi.mock("./golfCourses", () => ({
  fetchGolfCoursesByIds,
}));

import { loadBucketListCourseSummaries } from "./bucketListCourses";

describe("loadBucketListCourseSummaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("preserves stored course order and formats locations", async () => {
    fetchGolfCoursesByIds.mockResolvedValue({
      data: [
        {
          id: "course-b",
          name: "Cypress Point",
          slug: "cypress-point",
          city: "Pebble Beach",
          region: "CA",
          country: "USA",
        },
        {
          id: "course-a",
          name: "National Golf Links",
          slug: "national-golf-links",
          city: "Southampton",
          region: "NY",
          country: "USA",
        },
      ],
      error: null,
    });

    const { data, error } = await loadBucketListCourseSummaries(["course-a", "course-b"]);

    expect(error).toBeNull();
    expect(data).toEqual([
      {
        id: "course-a",
        name: "National Golf Links",
        slug: "national-golf-links",
        location: "Southampton, New York, USA",
      },
      {
        id: "course-b",
        name: "Cypress Point",
        slug: "cypress-point",
        location: "Pebble Beach, California, USA",
      },
    ]);
  });

  it("returns an empty list when there are no saved ids", async () => {
    const { data, error } = await loadBucketListCourseSummaries([]);

    expect(error).toBeNull();
    expect(data).toEqual([]);
    expect(fetchGolfCoursesByIds).not.toHaveBeenCalled();
  });
});
