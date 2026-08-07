import { describe, expect, it } from "vitest";
import type { FeedPost } from "../data/portalSocial";
import {
  badgeToneForPost,
  buildFeedMetaChips,
  buildVisibleFeedMetaChips,
  getFeedCaptionPreview,
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
  it("uses formatted post.rating instead of duplicate course rating detail", () => {
    const chips = buildFeedMetaChips(makePost());
    const ratingChips = chips.filter((chip) => chip.label === "Rating");
    expect(ratingChips).toHaveLength(1);
    expect(ratingChips[0]?.value).toBe("9.0/10.0");
    expect(chips.some((chip) => chip.label === "Played")).toBe(true);
  });

  it("adds a formatted rating chip when post.rating is decimal", () => {
    const chips = buildFeedMetaChips(makePost({ rating: 9.4 }));
    expect(chips.some((chip) => chip.label === "Rating" && chip.value === "9.4/10.0")).toBe(
      true,
    );
  });

  it("does not add an empty rating chip when post.rating is null", () => {
    const chips = buildFeedMetaChips(
      makePost({
        rating: undefined,
        details: [
          { label: "Location", value: "Southampton, NY" },
          { label: "Played", value: "Jun 12, 2026" },
          { label: "Would play again", value: "Yes" },
        ],
      }),
    );
    expect(chips.some((chip) => chip.label === "Rating")).toBe(false);
  });

  it("does not add a rating chip for invalid values", () => {
    const chips = buildFeedMetaChips(makePost({ rating: 10.1 }));
    expect(chips.some((chip) => chip.label === "Rating")).toBe(false);
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

describe("buildVisibleFeedMetaChips", () => {
  it("removes course location and rating when the card already presents them", () => {
    expect(buildVisibleFeedMetaChips(makePost(), true).map((chip) => chip.label)).toEqual([
      "Played",
      "Would play again",
    ]);
  });
});

describe("getFeedCaptionPreview", () => {
  it("keeps concise posts intact and makes long posts expandable", () => {
    expect(getFeedCaptionPreview("A concise member update.", false)).toEqual({
      text: "A concise member update.",
      isTruncated: false,
    });
    const longPreview = getFeedCaptionPreview("A thoughtful round note ".repeat(30), false, 100);
    expect(longPreview.isTruncated).toBe(true);
    expect(longPreview.text.length).toBeLessThanOrEqual(101);
    expect(getFeedCaptionPreview("A thoughtful round note ".repeat(30), true).isTruncated).toBe(false);
  });
});

describe("isCourseRoundPost", () => {
  it("detects course-review posts", () => {
    expect(isCourseRoundPost(makePost())).toBe(true);
  });

  it("detects experience badge label", () => {
    expect(
      isCourseRoundPost(
        makePost({ postType: "photo", requestLabel: "Experience" }),
      ),
    ).toBe(true);
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
