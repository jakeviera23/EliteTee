import { describe, expect, it } from "vitest";
import { photos } from "../assets/photos";
import { buildCourseGalleryPhotos } from "./courseDetail";

describe("buildCourseGalleryPhotos", () => {
  it("includes an approved bundled reference when stored course media is absent", () => {
    const gallery = buildCourseGalleryPhotos(
      { name: "Bandon Trails", image_url: null, thumbnail_url: null },
      [],
    );

    expect(gallery).toHaveLength(1);
    expect(gallery[0]?.signed_url).toBe(photos.courseBandonDunes);
    expect(gallery[0]?.caption).toBe(
      "Destination reference photography — not verified as course-specific",
    );
  });

  it("leaves unknown courses empty rather than inventing imagery", () => {
    expect(
      buildCourseGalleryPhotos(
        { name: "Unknown Test Club", image_url: null, thumbnail_url: null },
        [],
      ),
    ).toEqual([]);
  });
});
