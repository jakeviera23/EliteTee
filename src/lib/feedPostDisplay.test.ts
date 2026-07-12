import { describe, expect, it } from "vitest";
import type { FeedPost } from "../data/portalSocial";
import { normalizeFeedExperienceBadge, resolveFeedCardBadgeLabel } from "./feedPostDisplay";

function makePost(overrides: Partial<FeedPost> = {}): FeedPost {
  return {
    id: "post-1",
    postType: "course-review",
    author: {
      id: "user-1",
      name: "Member",
      handle: "member",
      location: "",
      homeCourse: "",
      bio: "",
      isVerified: false,
      followers: 0,
      following: 0,
      coursesPlayed: 0,
      roundsPosted: 0,
      countriesPlayed: 0,
      favoriteCourses: [],
    },
    courseName: "National Golf Links",
    courseLocation: "Southampton, NY",
    images: [],
    imageAlt: "",
    caption: "Great round.",
    likes: 0,
    comments: 0,
    timestamp: "2d ago",
    ...overrides,
  };
}

describe("normalizeFeedExperienceBadge", () => {
  it("maps legacy Course Played to Experience", () => {
    expect(normalizeFeedExperienceBadge("Course Played")).toBe("Experience");
  });

  it("maps Round Review to Experience", () => {
    expect(normalizeFeedExperienceBadge("Round Review")).toBe("Experience");
  });

  it("preserves custom member-facing labels", () => {
    expect(normalizeFeedExperienceBadge("Traveling")).toBe("Traveling");
  });
});

describe("resolveFeedCardBadgeLabel", () => {
  it("uses normalized requestLabel for legacy course posts", () => {
    expect(
      resolveFeedCardBadgeLabel(makePost({ requestLabel: "Course Played" })),
    ).toBe("Experience");
  });

  it("defaults linked course rounds to Experience", () => {
    expect(
      resolveFeedCardBadgeLabel(
        makePost({ postType: "photo", requestLabel: undefined, memberCourseRoundId: "round-1" }),
      ),
    ).toBe("Experience");
  });
});
