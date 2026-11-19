import { describe, expect, it } from "vitest";
import {
  applyFeedPostPatch,
  mergeIncomingFeedPostsPreservingOptimisticEngagement,
  mergeResolvedFeedMediaPreservingEngagement,
} from "./feedPostMerge";
import type { MobileFeedPost } from "@/types/feed";

function post(overrides: Partial<MobileFeedPost> = {}): MobileFeedPost {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    authorUserId: "user-1",
    authorName: "Alex",
    authorClub: "Club",
    authorLocation: "NY",
    authorAvatarUrl: null,
    badge: "Round",
    headline: "Course",
    message: "Great day",
    timestamp: "1h ago",
    createdAt: "2026-01-01T00:00:00.000Z",
    imageUrls: [],
    likeCount: 5,
    commentCount: 0,
    isLiked: false,
    isSaved: false,
    ...overrides,
  };
}

describe("applyFeedPostPatch", () => {
  it("merges onto the current list entry by id", () => {
    const posts = [post({ isLiked: false, likeCount: 5 }), post({ id: "other", likeCount: 1 })];
    const next = applyFeedPostPatch(posts, posts[0]!.id, { isLiked: true, likeCount: 6 });
    expect(next[0]).toMatchObject({ isLiked: true, likeCount: 6 });
    expect(next[1]).toMatchObject({ id: "other", likeCount: 1 });
  });
});

describe("mergeResolvedFeedMediaPreservingEngagement", () => {
  it("keeps local like/save when media resolve returns stale engagement", () => {
    const current = [post({ isLiked: true, likeCount: 6, isSaved: true, imageUrls: ["old"] })];
    const resolved = [
      post({ isLiked: false, likeCount: 5, isSaved: false, imageUrls: ["signed://new"] }),
    ];
    const next = mergeResolvedFeedMediaPreservingEngagement(current, resolved);
    expect(next[0]).toMatchObject({
      isLiked: true,
      likeCount: 6,
      isSaved: true,
      imageUrls: ["signed://new"],
    });
  });
});

describe("mergeIncomingFeedPostsPreservingOptimisticEngagement", () => {
  it("preserves an optimistic like that the server page has not caught up to", () => {
    const current = [post({ isLiked: true, likeCount: 6 })];
    const incoming = [post({ isLiked: false, likeCount: 5, message: "updated caption" })];
    const next = mergeIncomingFeedPostsPreservingOptimisticEngagement(current, incoming);
    expect(next[0]).toMatchObject({
      isLiked: true,
      likeCount: 6,
      message: "updated caption",
    });
  });

  it("accepts server engagement when it matches local", () => {
    const current = [post({ isLiked: true, likeCount: 6 })];
    const incoming = [post({ isLiked: true, likeCount: 6 })];
    const next = mergeIncomingFeedPostsPreservingOptimisticEngagement(current, incoming);
    expect(next[0]).toMatchObject({ isLiked: true, likeCount: 6 });
  });
});
