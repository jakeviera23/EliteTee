import { describe, expect, it } from "vitest";
import { stripFeedPostSignedMedia } from "./feedSignedMedia";
import type { MobileFeedPost } from "../types/feed";

function post(overrides: Partial<MobileFeedPost> = {}): MobileFeedPost {
  return {
    id: "post-1",
    authorUserId: "user-1",
    authorName: "Member",
    authorClub: "",
    authorLocation: "",
    authorAvatarUrl: "user-1/avatar/a.jpg",
    badge: "Update",
    headline: "Hello",
    message: "Hello",
    timestamp: "just now",
    createdAt: "2026-01-01T00:00:00.000Z",
    imageUrls: ["https://signed.example/photo.jpg?token=abc"],
    likeCount: 0,
    commentCount: 0,
    isLiked: false,
    isSaved: false,
    ...overrides,
  };
}

describe("stripFeedPostSignedMedia", () => {
  it("clears signed image URLs and drops signed avatar URLs", () => {
    const [stripped] = stripFeedPostSignedMedia([
      post({
        authorAvatarUrl: "https://signed.example/avatar.jpg?token=1",
        imageUrls: ["https://signed.example/a.jpg"],
      }),
    ]);

    expect(stripped.imageUrls).toEqual([]);
    expect(stripped.authorAvatarUrl).toBeNull();
  });

  it("preserves storage-path avatars for re-sign", () => {
    const [stripped] = stripFeedPostSignedMedia([post()]);
    expect(stripped.authorAvatarUrl).toBe("user-1/avatar/a.jpg");
    expect(stripped.imageUrls).toEqual([]);
  });
});
