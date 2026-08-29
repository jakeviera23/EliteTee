import { describe, expect, it } from "vitest";
import type { FeedPost } from "../data/portalSocial";
import {
  buildProfileFeedActivityPreview,
  isMeaningfulFeedLocation,
  resolveFeedAuthorRole,
} from "./feedPostDisplay";

function feedPost(overrides: Partial<FeedPost> = {}): FeedPost {
  return {
    id: "post-1",
    postType: "course-review",
    author: {
      id: "user-1",
      name: "Jordan Lee",
      handle: "jordanlee",
      location: "Southampton, NY",
      homeCourse: "National Golf Links",
      bio: "",
      title: "Not specified",
      isVerified: true,
      followers: 0,
      following: 0,
      coursesPlayed: 0,
      roundsPosted: 0,
      countriesPlayed: 0,
      favoriteCourses: [],
    },
    courseName: "Cypress Point",
    courseLocation: "Location not set",
    images: ["/photo.jpg"],
    imageAlt: "Cypress Point",
    caption: "A long day on the cliffs with perfect conditions and great company.",
    likes: 0,
    comments: 0,
    timestamp: "2h ago",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("resolveFeedAuthorRole", () => {
  it("skips placeholder author titles and falls back to home club", () => {
    const role = resolveFeedAuthorRole(feedPost().author);
    expect(role).toBe("National Golf Links");
  });

  it("returns a meaningful professional headline when present", () => {
    const role = resolveFeedAuthorRole({
      ...feedPost().author,
      title: "Private equity",
    });
    expect(role).toBe("Private equity");
  });
});

describe("isMeaningfulFeedLocation", () => {
  it("treats Location not set as empty", () => {
    expect(isMeaningfulFeedLocation("Location not set")).toBe(false);
    expect(isMeaningfulFeedLocation("Pebble Beach, CA")).toBe(true);
  });
});

describe("buildProfileFeedActivityPreview", () => {
  it("builds compact profile activity metadata without placeholder location", () => {
    const preview = buildProfileFeedActivityPreview(feedPost());

    expect(preview.title).toBe("Cypress Point");
    expect(preview.locationLabel).toBeNull();
    expect(preview.thumbnailUrl).toBe("/photo.jpg");
    expect(preview.excerpt.endsWith("…")).toBe(false);
  });
});
