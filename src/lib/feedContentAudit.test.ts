import { describe, expect, it } from "vitest";
import { getFeedContentFlags, shouldSuppressFeedPostFromMemberStream } from "./feedContentAudit";
import type { FeedPost } from "../data/portalSocial";

function makePost(overrides: Partial<FeedPost> = {}): FeedPost {
  return {
    id: "post-1",
    postType: "played-today",
    author: {
      id: "user-1",
      name: "Test Member",
      handle: "test",
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
    courseName: "National Golf Links",
    courseLocation: "NY",
    caption: "Great day on the course.",
    images: [],
    imageAlt: "",
    likes: 0,
    comments: 0,
    timestamp: "1h ago",
    ...overrides,
  };
}

describe("getFeedContentFlags", () => {
  it("returns no flags for healthy posts", () => {
    expect(getFeedContentFlags(makePost())).toEqual([]);
  });

  it("flags empty captions", () => {
    expect(getFeedContentFlags(makePost({ caption: "  " }))).toContain("Empty message body");
  });

  it("flags json-like captions", () => {
    expect(getFeedContentFlags(makePost({ caption: '{"message":"hello"}' }))).toContain(
      "Message may be unparsed JSON",
    );
  });

  it("skips founder welcome post", () => {
    expect(getFeedContentFlags(makePost({ id: "founder-welcome", caption: "" }))).toEqual([]);
  });
});

describe("shouldSuppressFeedPostFromMemberStream", () => {
  it("suppresses severe empty/test/JSON posts only", () => {
    expect(shouldSuppressFeedPostFromMemberStream(makePost({ caption: "" }))).toBe(true);
    expect(shouldSuppressFeedPostFromMemberStream(makePost({ caption: "test post" }))).toBe(true);
    expect(
      shouldSuppressFeedPostFromMemberStream(makePost({ caption: '{"composerPostType":"general"}' })),
    ).toBe(true);
  });

  it("does not suppress normal low-detail or long posts", () => {
    expect(shouldSuppressFeedPostFromMemberStream(makePost())).toBe(false);
    expect(
      shouldSuppressFeedPostFromMemberStream(
        makePost({
          caption: "x".repeat(650),
          details: [{ label: "Notes", value: "" }],
        }),
      ),
    ).toBe(false);
  });
});
