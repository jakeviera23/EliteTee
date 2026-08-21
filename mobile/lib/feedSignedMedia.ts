import type { MobileFeedPost } from "@/types/feed";

/** Cache-safe copy — never persist short-lived signed media URLs. */
export function stripFeedPostSignedMedia(posts: MobileFeedPost[]): MobileFeedPost[] {
  return posts.map((post) => {
    const avatar = post.authorAvatarUrl?.trim() ?? "";
    return {
      ...post,
      imageUrls: [],
      // Drop expired signed avatar URLs; keep storage paths for re-sign.
      authorAvatarUrl: avatar && !/^https?:\/\//i.test(avatar) ? avatar : null,
    };
  });
}
