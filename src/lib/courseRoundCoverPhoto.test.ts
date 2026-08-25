import { describe, expect, it } from "vitest";
import {
  buildListCoverImageUrls,
  feedListPhotoMoreCount,
  orderPhotosWithCoverFirst,
  pickListCoverPhoto,
  resolveEffectiveCoverPhotoId,
  sortPhotosByGalleryOrder,
} from "./courseRoundCoverPhoto";
import type { MemberCourseRoundPhotoRecord } from "../types/memberCourseRoundPhoto";

const photos = [
  { id: "photo-a", sort_order: 0, created_at: "2026-01-01T00:00:00.000Z" },
  { id: "photo-b", sort_order: 1, created_at: "2026-01-02T00:00:00.000Z" },
  { id: "photo-c", sort_order: 2, created_at: "2026-01-03T00:00:00.000Z" },
];

describe("sortPhotosByGalleryOrder", () => {
  it("orders by sort_order then created_at", () => {
    const unordered = [photos[2], photos[0], photos[1]];
    expect(sortPhotosByGalleryOrder(unordered).map((photo) => photo.id)).toEqual([
      "photo-a",
      "photo-b",
      "photo-c",
    ]);
  });
});

describe("resolveEffectiveCoverPhotoId", () => {
  it("returns null for legacy posts without cover metadata", () => {
    expect(resolveEffectiveCoverPhotoId(null, photos)).toBeNull();
    expect(resolveEffectiveCoverPhotoId(undefined, photos)).toBeNull();
  });

  it("ignores stale cover ids that no longer exist on the round", () => {
    expect(resolveEffectiveCoverPhotoId("missing-photo", photos)).toBeNull();
  });

  it("keeps a valid cover id", () => {
    expect(resolveEffectiveCoverPhotoId("photo-b", photos)).toBe("photo-b");
  });
});

describe("orderPhotosWithCoverFirst", () => {
  it("preserves legacy order when cover metadata is missing", () => {
    expect(orderPhotosWithCoverFirst(photos, null).map((photo) => photo.id)).toEqual([
      "photo-a",
      "photo-b",
      "photo-c",
    ]);
  });

  it("moves the selected cover photo to the front without changing relative order", () => {
    expect(orderPhotosWithCoverFirst(photos, "photo-c").map((photo) => photo.id)).toEqual([
      "photo-c",
      "photo-a",
      "photo-b",
    ]);
  });

  it("leaves order unchanged when the cover is already first", () => {
    expect(orderPhotosWithCoverFirst(photos, "photo-a").map((photo) => photo.id)).toEqual([
      "photo-a",
      "photo-b",
      "photo-c",
    ]);
  });

  it("falls back to legacy order when cover id is invalid", () => {
    expect(orderPhotosWithCoverFirst(photos, "deleted-photo").map((photo) => photo.id)).toEqual([
      "photo-a",
      "photo-b",
      "photo-c",
    ]);
  });
});

describe("pickListCoverPhoto", () => {
  it("returns null when no photos exist", () => {
    expect(pickListCoverPhoto([], "photo-b")).toBeNull();
  });

  it("uses the explicit cover photo when valid", () => {
    expect(pickListCoverPhoto(photos, "photo-c")?.id).toBe("photo-c");
  });

  it("falls back to the first sorted photo when cover metadata is missing", () => {
    expect(pickListCoverPhoto(photos, null)?.id).toBe("photo-a");
  });

  it("falls back to the first sorted photo when cover id is stale", () => {
    expect(pickListCoverPhoto(photos, "missing-photo")?.id).toBe("photo-a");
  });
});

describe("buildListCoverImageUrls", () => {
  function signedPhoto(
    id: string,
    sortOrder: number,
    url: string,
  ): MemberCourseRoundPhotoRecord {
    return {
      id,
      member_course_round_id: "round-1",
      user_id: "user-1",
      storage_path: `${id}.jpg`,
      sort_order: sortOrder,
      is_featured: false,
      moderation_status: "active",
      created_at: "2026-01-01T00:00:00.000Z",
      signed_url: url,
    };
  }

  it("returns at most one signed url", () => {
    const urls = buildListCoverImageUrls(
      [
        signedPhoto("photo-a", 0, "https://example/a.jpg"),
        signedPhoto("photo-b", 1, "https://example/b.jpg"),
      ],
      "photo-b",
    );

    expect(urls).toEqual(["https://example/b.jpg"]);
  });
});

describe("feedListPhotoMoreCount", () => {
  it("returns null for a single photo", () => {
    expect(feedListPhotoMoreCount(1)).toBeNull();
    expect(feedListPhotoMoreCount(0)).toBeNull();
  });

  it("returns total minus one for multi-photo rounds", () => {
    expect(feedListPhotoMoreCount(10)).toBe(9);
    expect(feedListPhotoMoreCount(2)).toBe(1);
  });
});
