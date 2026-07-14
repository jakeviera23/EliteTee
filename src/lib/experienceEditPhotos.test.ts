import { describe, expect, it } from "vitest";
import type { MemberCourseRoundPhotoRecord } from "../types/memberCourseRoundPhoto";
import {
  buildExperienceEditPhotoRecords,
  mapActivePhotosForExperienceEdit,
  resolveExperienceEditCoverPhotoId,
} from "./experienceEditPhotos";

function makePhoto(
  overrides: Partial<MemberCourseRoundPhotoRecord> = {},
): MemberCourseRoundPhotoRecord {
  return {
    id: "photo-1",
    member_course_round_id: "round-1",
    user_id: "user-1",
    storage_path: "user/round/photo-1.jpg",
    sort_order: 0,
    is_featured: false,
    moderation_status: "active",
    created_at: "2026-06-01T00:00:00.000Z",
    signed_url: "https://example.com/photo-1.jpg",
    ...overrides,
  };
}

describe("mapActivePhotosForExperienceEdit", () => {
  it("loads active uploaded photos in gallery order for the edit modal", () => {
    const photos = mapActivePhotosForExperienceEdit([
      makePhoto({ id: "photo-b", sort_order: 1, created_at: "2026-06-02T00:00:00.000Z" }),
      makePhoto({ id: "photo-a", sort_order: 0, created_at: "2026-06-01T00:00:00.000Z" }),
      makePhoto({
        id: "photo-hidden",
        sort_order: 2,
        moderation_status: "hidden",
        signed_url: "https://example.com/hidden.jpg",
      }),
      makePhoto({ id: "photo-unsigned", sort_order: 3, signed_url: null }),
    ]);

    expect(photos.map((photo) => photo.id)).toEqual(["photo-a", "photo-b"]);
    expect(photos[0]?.previewUrl).toBe("https://example.com/photo-1.jpg");
  });
});

describe("resolveExperienceEditCoverPhotoId", () => {
  const photos = [
    { id: "photo-a", previewUrl: "a", sort_order: 0, created_at: "2026-06-01T00:00:00.000Z" },
    { id: "photo-b", previewUrl: "b", sort_order: 1, created_at: "2026-06-02T00:00:00.000Z" },
  ];

  it("selects the stored cover photo when present", () => {
    expect(resolveExperienceEditCoverPhotoId("photo-b", photos)).toBe("photo-b");
  });

  it("falls back to the first active photo for legacy posts without cover metadata", () => {
    expect(resolveExperienceEditCoverPhotoId(null, photos)).toBe("photo-a");
  });

  it("ignores stale cover ids that no longer exist", () => {
    expect(resolveExperienceEditCoverPhotoId("missing-photo", photos)).toBe("photo-a");
  });
});

describe("buildExperienceEditPhotoRecords", () => {
  it("builds feed image records without re-uploading files", () => {
    const records = buildExperienceEditPhotoRecords(
      [{ id: "photo-b", previewUrl: "https://example.com/b.jpg", sort_order: 1, created_at: "2026-06-02T00:00:00.000Z" }],
      "round-1",
    );

    expect(records[0]).toMatchObject({
      id: "photo-b",
      member_course_round_id: "round-1",
      storage_path: "",
      signed_url: "https://example.com/b.jpg",
    });
  });
});
