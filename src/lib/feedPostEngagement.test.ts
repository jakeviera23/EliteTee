import { describe, expect, it } from "vitest";
import {
  applyLikeToggle,
  applySaveToggle,
  buildEngagementSummaryMap,
  canDeleteFeedPostComment,
  isDuplicateEngagementError,
  isPersistedFeedPostId,
  mergeEngagementIntoFeedPost,
  validateFeedPostCommentBody,
} from "./feedPostEngagement";
import type { FeedPost } from "../data/portalSocial";

const POST_ID = "11111111-1111-4111-8111-111111111111";

function basePost(overrides: Partial<FeedPost> = {}): FeedPost {
  return {
    id: POST_ID,
    postType: "played-today",
    author: {
      id: "author-1",
      name: "Jordan Lee",
      handle: "jordanlee",
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
    courseName: "",
    courseLocation: "",
    images: [],
    imageAlt: "",
    caption: "Great round today.",
    likes: 0,
    comments: 0,
    timestamp: "1h ago",
    ...overrides,
  };
}

describe("isPersistedFeedPostId", () => {
  it("accepts member feed post UUIDs and rejects founder mock ids", () => {
    expect(isPersistedFeedPostId(POST_ID)).toBe(true);
    expect(isPersistedFeedPostId("founder-welcome")).toBe(false);
  });
});

describe("applyLikeToggle", () => {
  it("increments and decrements like counts optimistically", () => {
    expect(applyLikeToggle({ liked: false, likeCount: 2 })).toEqual({
      liked: true,
      likeCount: 3,
    });
    expect(applyLikeToggle({ liked: true, likeCount: 3 })).toEqual({
      liked: false,
      likeCount: 2,
    });
  });

  it("never drops like counts below zero", () => {
    expect(applyLikeToggle({ liked: true, likeCount: 0 })).toEqual({
      liked: false,
      likeCount: 0,
    });
  });
});

describe("applySaveToggle", () => {
  it("toggles saved state", () => {
    expect(applySaveToggle(false)).toBe(true);
    expect(applySaveToggle(true)).toBe(false);
  });
});

describe("isDuplicateEngagementError", () => {
  it("detects duplicate like/save insert conflicts", () => {
    expect(isDuplicateEngagementError({ code: "23505" })).toBe(true);
    expect(isDuplicateEngagementError({ message: "duplicate key value violates unique constraint" })).toBe(
      true,
    );
    expect(isDuplicateEngagementError({ code: "42501" })).toBe(false);
  });
});

describe("validateFeedPostCommentBody", () => {
  it("accepts non-empty trimmed comments", () => {
    expect(validateFeedPostCommentBody("  Nice round  ")).toEqual({
      ok: true,
      value: "Nice round",
    });
  });

  it("rejects empty comments", () => {
    expect(validateFeedPostCommentBody("   ").ok).toBe(false);
  });
});

describe("canDeleteFeedPostComment", () => {
  it("allows only the comment author to delete", () => {
    expect(canDeleteFeedPostComment("user-a", "user-a")).toBe(true);
    expect(canDeleteFeedPostComment("user-a", "user-b")).toBe(false);
    expect(canDeleteFeedPostComment("user-a", null)).toBe(false);
  });
});

describe("buildEngagementSummaryMap", () => {
  it("returns empty engagement state for posts with no likes or comments", () => {
    const summaries = buildEngagementSummaryMap({
      postIds: [POST_ID],
      likeRows: [],
      saveRows: [],
      commentRows: [],
      viewerLikePostIds: new Set(),
      viewerSavePostIds: new Set(),
      commentAuthorsByUserId: {},
    });

    expect(summaries.get(POST_ID)).toEqual({
      likeCount: 0,
      commentCount: 0,
      isLiked: false,
      isSaved: false,
    });
  });

  it("counts likes, comments, and viewer state without duplicate inflation", () => {
    const summaries = buildEngagementSummaryMap({
      postIds: [POST_ID],
      likeRows: [{ post_id: POST_ID }, { post_id: POST_ID }],
      saveRows: [],
      commentRows: [
        {
          id: "comment-1",
          post_id: POST_ID,
          user_id: "user-a",
          body: "Well played.",
          created_at: "2026-07-01T12:00:00.000Z",
        },
      ],
      viewerLikePostIds: new Set([POST_ID]),
      viewerSavePostIds: new Set([POST_ID]),
      commentAuthorsByUserId: {
        "user-a": { full_name: "Alex Kim", club_logo_url: null },
      },
    });

    expect(summaries.get(POST_ID)).toMatchObject({
      likeCount: 2,
      commentCount: 1,
      isLiked: true,
      isSaved: true,
      latestComment: {
        authorName: "Alex Kim",
        body: "Well played.",
      },
    });
  });
});

describe("mergeEngagementIntoFeedPost", () => {
  it("merges persisted engagement into feed posts", () => {
    const merged = mergeEngagementIntoFeedPost(basePost(), {
      likeCount: 4,
      commentCount: 2,
      isLiked: true,
      isSaved: false,
      latestComment: {
        id: "comment-1",
        postId: POST_ID,
        userId: "user-a",
        authorName: "Alex Kim",
        body: "Well played.",
        createdAt: "2026-07-01T12:00:00.000Z",
        displayTimestamp: "1h ago",
      },
    });

    expect(merged.likes).toBe(4);
    expect(merged.comments).toBe(2);
    expect(merged.isLiked).toBe(true);
    expect(merged.isSaved).toBe(false);
    expect(merged.commentPreview).toEqual({
      author: "Alex Kim",
      text: "Well played.",
    });
  });
});
