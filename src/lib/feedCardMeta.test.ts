import { describe, expect, it } from "vitest";
import type { FeedPost } from "../data/portalSocial";
import { buildFeedMetaChips } from "./feedCardMeta";

function basePost(overrides: Partial<FeedPost> = {}): FeedPost {
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
      followers: 0,
      following: 0,
      coursesPlayed: 0,
      roundsPosted: 0,
      countriesPlayed: 0,
      favoriteCourses: [],
      isVerified: false,
    },
    courseName: "Test Course",
    courseLocation: "Test City",
    images: [],
    imageAlt: "",
    caption: "",
    likes: 0,
    comments: 0,
    timestamp: "Just now",
    ...overrides,
  };
}

describe("buildFeedMetaChips", () => {
  it("adds a formatted rating chip when post.rating is valid", () => {
    const chips = buildFeedMetaChips(basePost({ rating: 9.4 }));
    expect(chips.some((chip) => chip.label === "Rating" && chip.value === "9.4/10.0")).toBe(true);
  });

  it("does not add an empty rating chip when post.rating is null", () => {
    const chips = buildFeedMetaChips(basePost({ rating: undefined }));
    expect(chips.some((chip) => chip.label === "Rating")).toBe(false);
  });

  it("does not add a rating chip for invalid values", () => {
    const chips = buildFeedMetaChips(basePost({ rating: 10.1 }));
    expect(chips.some((chip) => chip.label === "Rating")).toBe(false);
  });
});
