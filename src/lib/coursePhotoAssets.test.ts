import { describe, expect, it } from "vitest";
import { getCoursePhoto, photos } from "../assets/photos";

describe("getCoursePhoto", () => {
  it("resolves known courses despite punctuation and casing differences", () => {
    expect(getCoursePhoto("PINE VALLEY GOLF CLUB")).toBe(photos.coursePineValley);
    expect(getCoursePhoto("Royal County Down Golf Club")).toBe(photos.courseRoyalCountyDown);
  });

  it("uses a destination image only for courses at that destination", () => {
    expect(getCoursePhoto("Bandon Dunes Golf Resort — Old Macdonald")).toBe(
      photos.courseBandonDunes,
    );
    expect(getCoursePhoto("Pacific dunes")).toBe(photos.courseBandonDunes);
  });

  it("does not invent a photograph for an unrelated course", () => {
    expect(getCoursePhoto("Liberty National")).toBeUndefined();
    expect(getCoursePhoto("Pinehurst No. 2")).toBeUndefined();
  });
});
