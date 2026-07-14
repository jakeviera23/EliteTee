import { describe, expect, it } from "vitest";
import {
  orderPhotosWithCoverFirst,
  resolveEffectiveCoverPhotoId,
  sortPhotosByGalleryOrder,
} from "./courseRoundCoverPhoto";

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
