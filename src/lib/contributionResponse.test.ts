import { describe, expect, it } from "vitest";
import type { FeedPost } from "../data/portalSocial";
import { buildContributionResponseAction, contributionCommentPlaceholder } from "./contributionResponse";

function post(overrides: Partial<FeedPost> = {}): FeedPost {
  return {
    id: "post", postType: "played-today",
    author: { id: "author", name: "Ryan Konrad", handle: "ryan", location: "New Jersey", homeCourse: "Liberty National", bio: "", isVerified: true, followers: 0, following: 0, coursesPlayed: 0, roundsPosted: 0, countriesPlayed: 0, favoriteCourses: [] },
    authorUserId: "author", courseName: "", courseLocation: "", images: [], imageAlt: "", caption: "", likes: 0, comments: 0, timestamp: "Now", ...overrides,
  };
}

describe("contribution response bridge", () => {
  it("turns a game post into a contextual private response", () => {
    const action = buildContributionResponseAction(post({ requestLabel: "Looking for Game", courseName: "Palm Beach" }), "viewer");
    expect(action?.label).toBe("I’m interested");
    expect(action?.draftMessage).toContain("Palm Beach");
  });

  it("does not prompt authors to respond to themselves", () => {
    expect(buildContributionResponseAction(post(), "author")).toBeNull();
  });

  it("uses a useful public prompt for travel posts", () => {
    expect(contributionCommentPlaceholder(post({ postType: "golf-travel" }))).toContain("local knowledge");
  });
});
