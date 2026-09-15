import { describe, expect, it } from "vitest";
import type { FeedPost } from "../data/portalSocial";
import {
  badgeToneForPost,
  buildFeedExperienceMetaLine,
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

describe("buildFeedExperienceMetaLine", () => {
  it("builds a compact Location · Rating · Date line without repeating course", () => {
    expect(buildFeedExperienceMetaLine(makePost())).toBe("Southampton, NY · 9.0 · Jun 12, 2026");
  });

  it("omits Would play again Yes from the compact line", () => {
    expect(buildFeedExperienceMetaLine(makePost())?.includes("Would play")).toBe(false);
  });

  it("includes Would play again when the answer is No", () => {
    expect(
      buildFeedExperienceMetaLine(
        makePost({
          details: [
            { label: "Location", value: "Southampton, NY" },
            { label: "Would play again", value: "No" },
          ],
        }),
      ),
    ).toContain("Would play again: No");
  });
});

describe("buildFeedMetaChips", () => {
  it("does not emit experience core chips for round posts", () => {
    const chips = buildFeedMetaChips(makePost());
    expect(chips.some((chip) => chip.label === "Location")).toBe(false);
    expect(chips.some((chip) => chip.label === "Rating")).toBe(false);
    expect(chips.some((chip) => chip.label === "Played")).toBe(false);
    expect(chips.some((chip) => chip.label === "Would play again")).toBe(false);
  });

  it("keeps non-core details on social posts and skips Would play again Yes", () => {
    const chips = buildFeedMetaChips(
      makePost({
        postType: "played-today",
        memberCourseRoundId: undefined,
        requestLabel: "Discussion",
        rating: undefined,
        details: [
          { label: "Dates", value: "Next week" },
          { label: "Would play again", value: "Yes" },
        ],
      }),
    );
    expect(chips.map((chip) => chip.label)).toEqual(["Dates"]);
  });

  it("adds a formatted rating chip on non-round posts when rating exists", () => {
    const chips = buildFeedMetaChips(
      makePost({
        postType: "played-today",
        memberCourseRoundId: undefined,
        requestLabel: "Discussion",
        details: [],
        rating: 9.4,
      }),
    );
    expect(chips.some((chip) => chip.label === "Rating" && chip.value === "9.4/10.0")).toBe(true);
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
