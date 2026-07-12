import { describe, expect, it } from "vitest";
import type { FeedPost } from "../data/portalSocial";
import {
  canMemberEditFeedPost,
  deriveCourseRoundEditDefaults,
  getFeedPostEditMode,
  isFeedPostEdited,
  mergeFeedPostAfterEdit,
  validateCourseRoundPostEditInput,
  validateTextPostEditInput,
} from "./feedPostEditing";

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
    courseName: "Test Course",
    courseLocation: "Scottsdale, AZ",
    images: ["https://example.com/photo.jpg"],
    imageAlt: "",
    caption: "Great round.",
    likes: 3,
    comments: 2,
    timestamp: "1h ago",
    rating: 9,
    details: [
      { label: "Location", value: "Scottsdale, AZ" },
      { label: "Played", value: "Jun 12, 2026" },
      { label: "Would play again", value: "Yes" },
    ],
    memberCourseRoundId: "round-1",
    authorUserId: "user-1",
    createdAt: "2026-06-12T10:00:00.000Z",
    updatedAt: "2026-06-12T10:00:00.000Z",
    ...overrides,
  };
}

describe("canMemberEditFeedPost", () => {
  it("allows owner to see edit", () => {
    expect(canMemberEditFeedPost(makePost(), "user-1")).toBe(true);
  });

  it("does not allow non-owner to see edit", () => {
    expect(canMemberEditFeedPost(makePost(), "user-2")).toBe(false);
  });

  it("does not allow editing founder welcome post", () => {
    expect(canMemberEditFeedPost(makePost({ id: "founder-welcome" }), "user-1")).toBe(false);
  });
});

describe("getFeedPostEditMode", () => {
  it("uses course-round mode for round posts", () => {
    expect(getFeedPostEditMode(makePost())).toBe("course-round");
  });

  it("uses text mode for general posts", () => {
    expect(
      getFeedPostEditMode(
        makePost({
          postType: "played-today",
          memberCourseRoundId: undefined,
          rating: undefined,
          details: [{ label: "Dates", value: "Next week" }],
        }),
      ),
    ).toBe("text");
  });
});

describe("validateTextPostEditInput", () => {
  it("rejects blank caption", () => {
    expect(validateTextPostEditInput({ message: "   " }).ok).toBe(false);
  });

  it("accepts trimmed caption", () => {
    expect(validateTextPostEditInput({ message: " Updated caption " }).ok).toBe(true);
  });
});

describe("validateCourseRoundPostEditInput", () => {
  it("accepts rating change from 9.0 to 9.4", () => {
    expect(
      validateCourseRoundPostEditInput({
        message: "Updated review",
        courseRating: 9.4,
        playedOn: "2026-06-12",
        wouldPlayAgain: true,
        location: "Scottsdale, AZ",
      }).ok,
    ).toBe(true);
  });

  it("rejects invalid 10.1 rating", () => {
    expect(
      validateCourseRoundPostEditInput({
        message: "Updated review",
        courseRating: 10.1,
        playedOn: "2026-06-12",
        wouldPlayAgain: true,
        location: "Scottsdale, AZ",
      }).ok,
    ).toBe(false);
  });

  it("rejects blank review text", () => {
    expect(
      validateCourseRoundPostEditInput({
        message: " ",
        courseRating: 9,
        playedOn: "2026-06-12",
        wouldPlayAgain: true,
        location: "Scottsdale, AZ",
      }).ok,
    ).toBe(false);
  });

  it("accepts structured city, region, and country for member-submitted course correction", () => {
    expect(
      validateCourseRoundPostEditInput({
        message: "Updated review",
        courseRating: 9,
        playedOn: "2026-06-12",
        wouldPlayAgain: true,
        location: "",
        city: "Southampton",
        region: "NY",
        country: "United States",
      }).ok,
    ).toBe(true);
  });
});

describe("isFeedPostEdited", () => {
  it("shows edited label when updated_at is later than created_at", () => {
    expect(
      isFeedPostEdited("2026-06-12T10:00:00.000Z", "2026-06-12T12:00:00.000Z"),
    ).toBe(true);
  });

  it("does not show edited label when timestamps match", () => {
    expect(
      isFeedPostEdited("2026-06-12T10:00:00.000Z", "2026-06-12T10:00:00.000Z"),
    ).toBe(false);
  });
});

describe("mergeFeedPostAfterEdit", () => {
  it("preserves likes, comments, saves, and shares state", () => {
    const previous = makePost({ likes: 4, comments: 3, isLiked: true, isSaved: true });
    const updated = makePost({
      caption: "Updated review",
      likes: 0,
      comments: 0,
      isLiked: false,
      isSaved: false,
      updatedAt: "2026-06-12T12:00:00.000Z",
    });

    const merged = mergeFeedPostAfterEdit(previous, updated);
    expect(merged.caption).toBe("Updated review");
    expect(merged.likes).toBe(4);
    expect(merged.comments).toBe(3);
    expect(merged.isLiked).toBe(true);
    expect(merged.isSaved).toBe(true);
  });

  it("preserves photos when update response has no images", () => {
    const previous = makePost({ images: ["https://example.com/photo.jpg"] });
    const updated = makePost({ images: [], caption: "Updated" });
    expect(mergeFeedPostAfterEdit(previous, updated).images).toEqual([
      "https://example.com/photo.jpg",
    ]);
  });
});

describe("deriveCourseRoundEditDefaults", () => {
  it("derives would play again from details", () => {
    const defaults = deriveCourseRoundEditDefaults(makePost());
    expect(defaults.message).toBe("Great round.");
    expect(defaults.location).toBe("Scottsdale, AZ");
    expect(defaults.wouldPlayAgain).toBe(true);
    expect(defaults.courseRating).toBe(9);
  });
});

describe("unauthorized update rejection", () => {
  it("requires matching authorUserId before client edit UI is shown", () => {
    expect(canMemberEditFeedPost(makePost({ authorUserId: "user-1" }), "user-99")).toBe(false);
  });
});
