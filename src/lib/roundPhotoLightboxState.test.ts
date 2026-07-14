import { describe, expect, it } from "vitest";
import {
  clampPhotoGalleryIndex,
  getPhotoGalleryNavigation,
} from "./roundPhotoLightboxState";

describe("clampPhotoGalleryIndex", () => {
  it("opens the clicked photo first", () => {
    expect(clampPhotoGalleryIndex(0, 4)).toBe(0);
    expect(clampPhotoGalleryIndex(2, 4)).toBe(2);
  });

  it("prevents stale or out-of-range indexes from causing flicker loops", () => {
    expect(clampPhotoGalleryIndex(9, 4)).toBe(3);
    expect(clampPhotoGalleryIndex(-2, 4)).toBe(0);
  });
});

describe("getPhotoGalleryNavigation", () => {
  it("disables Previous on the first photo", () => {
    const navigation = getPhotoGalleryNavigation(0, 4);
    expect(navigation.canGoPrev).toBe(false);
    expect(navigation.canGoNext).toBe(true);
    expect(navigation.prevIndex).toBeNull();
    expect(navigation.nextIndex).toBe(1);
  });

  it("disables Next on the last photo", () => {
    const navigation = getPhotoGalleryNavigation(3, 4);
    expect(navigation.canGoPrev).toBe(true);
    expect(navigation.canGoNext).toBe(false);
    expect(navigation.prevIndex).toBe(2);
    expect(navigation.nextIndex).toBeNull();
  });

  it("supports Previous and Next between middle photos", () => {
    const navigation = getPhotoGalleryNavigation(1, 4);
    expect(navigation.canGoPrev).toBe(true);
    expect(navigation.canGoNext).toBe(true);
    expect(navigation.prevIndex).toBe(0);
    expect(navigation.nextIndex).toBe(2);
  });
});

describe("gallery open and navigation sequences", () => {
  it("opens on the clicked photo when the gallery remounts after close", () => {
    expect(clampPhotoGalleryIndex(0, 4)).toBe(0);
    expect(clampPhotoGalleryIndex(2, 4)).toBe(2);
  });

  it("moves forward and backward without wrapping", () => {
    let index = clampPhotoGalleryIndex(1, 3);

    const firstNext = getPhotoGalleryNavigation(index, 3);
    expect(firstNext.nextIndex).toBe(2);
    index = firstNext.nextIndex ?? index;

    const atLast = getPhotoGalleryNavigation(index, 3);
    expect(atLast.canGoNext).toBe(false);

    const previous = getPhotoGalleryNavigation(index, 3);
    expect(previous.prevIndex).toBe(1);
  });

  it("supports keyboard navigation boundaries for arrow keys", () => {
    expect(getPhotoGalleryNavigation(0, 2).canGoPrev).toBe(false);
    expect(getPhotoGalleryNavigation(0, 2).canGoNext).toBe(true);
    expect(getPhotoGalleryNavigation(1, 2).canGoPrev).toBe(true);
    expect(getPhotoGalleryNavigation(1, 2).canGoNext).toBe(false);
  });
});
