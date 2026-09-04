import { describe, expect, it } from "vitest";
import {
  buildRoundImageUrls,
  galleryDisplayUrl,
  isVideoRoundPhoto,
} from "./courseRoundCoverPhoto";
import type { MobileCourseRoundPhoto } from "../types/courseRoundPhoto";

function photo(overrides: Partial<MobileCourseRoundPhoto>): MobileCourseRoundPhoto {
  return {
    id: "p1",
    member_course_round_id: "r1",
    storage_path: "user/round/a.jpg",
    caption: null,
    sort_order: 0,
    ...overrides,
  };
}

describe("courseRoundCoverPhoto video safety", () => {
  it("detects video rows by media_kind, mime, and extension", () => {
    expect(isVideoRoundPhoto(photo({ media_kind: "video" }))).toBe(true);
    expect(isVideoRoundPhoto(photo({ mime_type: "video/mp4" }))).toBe(true);
    expect(isVideoRoundPhoto(photo({ storage_path: "user/round/clip.mp4" }))).toBe(true);
    expect(isVideoRoundPhoto(photo({ media_kind: "image", mime_type: "image/jpeg" }))).toBe(
      false,
    );
  });

  it("never returns raw video URLs for Image rendering", () => {
    expect(
      galleryDisplayUrl(
        photo({
          media_kind: "video",
          storage_path: "user/round/clip.mp4",
          signed_url: "https://cdn.example/clip.mp4?token=1",
        }),
      ),
    ).toBeNull();
  });

  it("uses poster signed URLs for video rows and keeps image URLs", () => {
    const urls = buildRoundImageUrls([
      photo({
        id: "v1",
        sort_order: 0,
        media_kind: "video",
        storage_path: "user/round/clip.mp4",
        signed_url: "https://cdn.example/poster.jpg?token=1",
      }),
      photo({
        id: "i1",
        sort_order: 1,
        media_kind: "image",
        signed_url: "https://cdn.example/shot.jpg?token=1",
      }),
      photo({
        id: "v2",
        sort_order: 2,
        media_kind: "video",
        storage_path: "user/round/other.mov",
        signed_url: null,
      }),
    ]);

    expect(urls).toEqual([
      "https://cdn.example/poster.jpg?token=1",
      "https://cdn.example/shot.jpg?token=1",
    ]);
  });
});
