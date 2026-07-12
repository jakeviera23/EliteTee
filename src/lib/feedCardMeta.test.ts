import { describe, expect, it } from "vitest";
import type { FeedPost } from "../data/portalSocial";
import {
  badgeToneForPost,
  buildFeedMetaChips,
  isCourseRoundPost,
} from "./feedCardMeta";

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
    rating: 9,
    details: [
      { label: "Location", value: "Southampton, NY" },
      { label: "Played", value: "Jun 12, 2026" },
      { label: "Course Rating", value: "9/10" },
      { label: "Would play again", value: "Yes" },
    ],
    ...overrides,
  };
}

describe("buildFeedMetaChips", () => {
  it("skips duplicate course rating when post.rating exists", () => {
    const chips = buildFeedMetaChips(makePost());
    expect(chips.some((chip) => chip.label === "Rating")).toBe(false);
    expect(chips.some((chip) => chip.label === "Played")).toBe(true);
  });

  it("maps would play again yes to positive tone", () => {
    const chips = buildFeedMetaChips(makePost());
    const again = chips.find((chip) => chip.label === "Would play again");
    expect(again?.tone).toBe("positive");
  });

  it("maps would play again no to emphasis tone", () => {
    const chips = buildFeedMetaChips(
      makePost({
        details: [{ label: "Would play again", value: "No" }],
      }),
    );
    expect(chips[0]?.tone).toBe("emphasis");
  });
});

describe("isCourseRoundPost", () => {
  it("detects course-review posts", () => {
    expect(isCourseRoundPost(makePost())).toBe(true);
  });

  it("detects linked member course rounds", () => {
    expect(
      isCourseRoundPost(
        makePost({ postType: "photo", memberCourseRoundId: "round-1" }),
      ),
    ).toBe(true);
  });
});

describe("badgeToneForPost", () => {
  it("uses location tone for travel posts", () => {
    expect(
      badgeToneForPost(makePost({ requestLabel: "Traveling", postType: "golf-travel" })),
    ).toBe("location");
  });
});
