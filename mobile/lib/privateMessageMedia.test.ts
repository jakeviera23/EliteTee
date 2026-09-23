import { describe, expect, it } from "vitest";
import {
  acceptsPrivateMessageImageByteSize,
  buildPrivateMessageImageManipulatorActions,
  computePrivateMessageImageResize,
  draftFromPrivateMessageImagePickerAsset,
  isHeicLikePrivateMessageImage,
  normalizePrivateMessageImageMime,
  PRIVATE_MESSAGE_IMAGE_COMPRESS_QUALITIES,
  PRIVATE_MESSAGE_IMAGE_MAX_BYTES,
  privateMessageImageCompressQualityAt,
  shouldPreprocessPrivateMessageImage,
  validatePrivateMessageImageDraft,
  validatePrivateMessageImageDrafts,
} from "./privateMessageImageRules";

describe("normalizePrivateMessageImageMime", () => {
  it("normalizes jpeg aliases and HEIC to image/jpeg", () => {
    expect(normalizePrivateMessageImageMime("image/jpg")).toBe("image/jpeg");
    expect(normalizePrivateMessageImageMime("image/heic")).toBe("image/jpeg");
    expect(normalizePrivateMessageImageMime(null, "photo.HEIC")).toBe("image/jpeg");
  });

  it("keeps png and webp", () => {
    expect(normalizePrivateMessageImageMime("image/png")).toBe("image/png");
    expect(normalizePrivateMessageImageMime("image/webp")).toBe("image/webp");
  });
});

describe("draftFromPrivateMessageImagePickerAsset", () => {
  it("preserves HEIC mime/fileName so preprocess can detect conversion need", () => {
    const result = draftFromPrivateMessageImagePickerAsset({
      uri: "file:///tmp/IMG_001.HEIC",
      mimeType: "image/heic",
      fileName: "IMG_001.HEIC",
      width: 1200,
      height: 900,
      type: "image",
    });
    expect(result).toEqual({
      draft: {
        uri: "file:///tmp/IMG_001.HEIC",
        mimeType: "image/heic",
        fileName: "IMG_001.HEIC",
        width: 1200,
        height: 900,
      },
    });
  });

  it("rejects video assets even if the picker returns one", () => {
    const result = draftFromPrivateMessageImagePickerAsset({
      uri: "file:///tmp/clip.mov",
      mimeType: "video/quicktime",
      fileName: "clip.mov",
      type: "video",
    });
    expect(result).toEqual({ error: "Only photos can be attached right now." });
  });

  it("rejects empty uris", () => {
    const result = draftFromPrivateMessageImagePickerAsset({
      uri: "  ",
      mimeType: "image/jpeg",
      type: "image",
    });
    expect(result).toEqual({
      error: "Could not read the selected photo. Please try another image.",
    });
  });
});

describe("isHeicLikePrivateMessageImage", () => {
  it("detects HEIC/HEIF by mime or extension", () => {
    expect(isHeicLikePrivateMessageImage("image/heic")).toBe(true);
    expect(isHeicLikePrivateMessageImage("image/heif")).toBe(true);
    expect(isHeicLikePrivateMessageImage(null, "IMG_001.HEIC")).toBe(true);
    expect(isHeicLikePrivateMessageImage("image/jpeg", "a.jpg")).toBe(false);
  });
});

describe("computePrivateMessageImageResize", () => {
  it("preserves aspect ratio and caps the longest edge at 1800", () => {
    expect(computePrivateMessageImageResize(4000, 3000)).toEqual({
      width: 1800,
      height: 1350,
    });
    expect(computePrivateMessageImageResize(3000, 4000)).toEqual({
      width: 1350,
      height: 1800,
    });
  });

  it("skips resize when already within the max edge", () => {
    expect(computePrivateMessageImageResize(1600, 1200)).toBeNull();
    expect(computePrivateMessageImageResize(1800, 1200)).toBeNull();
  });
});

describe("shouldPreprocessPrivateMessageImage / size decisions", () => {
  it("skips already-small allowed images", () => {
    expect(
      shouldPreprocessPrivateMessageImage({
        byteSize: 800_000,
        mimeType: "image/jpeg",
        width: 1200,
        height: 900,
      }),
    ).toBe(false);
  });

  it("preprocesses oversized, oversized-dimension, and HEIC inputs", () => {
    expect(
      shouldPreprocessPrivateMessageImage({
        byteSize: PRIVATE_MESSAGE_IMAGE_MAX_BYTES + 1,
        mimeType: "image/jpeg",
        width: 1200,
        height: 900,
      }),
    ).toBe(true);
    expect(
      shouldPreprocessPrivateMessageImage({
        byteSize: 800_000,
        mimeType: "image/jpeg",
        width: 4000,
        height: 3000,
      }),
    ).toBe(true);
    expect(
      shouldPreprocessPrivateMessageImage({
        byteSize: 800_000,
        mimeType: "image/heic",
        width: 1200,
        height: 900,
      }),
    ).toBe(true);
  });

  it("accepts only positive sizes at or under the 5 MB threshold", () => {
    expect(acceptsPrivateMessageImageByteSize(1)).toBe(true);
    expect(acceptsPrivateMessageImageByteSize(PRIVATE_MESSAGE_IMAGE_MAX_BYTES)).toBe(true);
    expect(acceptsPrivateMessageImageByteSize(PRIVATE_MESSAGE_IMAGE_MAX_BYTES + 1)).toBe(false);
    expect(acceptsPrivateMessageImageByteSize(0)).toBe(false);
  });

  it("uses progressive JPEG qualities 0.8 → 0.65 → 0.5", () => {
    expect([...PRIVATE_MESSAGE_IMAGE_COMPRESS_QUALITIES]).toEqual([0.8, 0.65, 0.5]);
    expect(privateMessageImageCompressQualityAt(0)).toBe(0.8);
    expect(privateMessageImageCompressQualityAt(1)).toBe(0.65);
    expect(privateMessageImageCompressQualityAt(2)).toBe(0.5);
    expect(privateMessageImageCompressQualityAt(3)).toBeNull();
  });

  it("builds resize actions only when needed", () => {
    expect(
      buildPrivateMessageImageManipulatorActions({
        width: 4000,
        height: 3000,
      }),
    ).toEqual([{ resize: { width: 1800, height: 1350 } }]);
    expect(
      buildPrivateMessageImageManipulatorActions({
        width: 1200,
        height: 900,
      }),
    ).toEqual([]);
    expect(
      buildPrivateMessageImageManipulatorActions({
        width: null,
        height: null,
      }),
    ).toEqual([]);
  });
});

describe("validatePrivateMessageImageDraft", () => {
  it("accepts allowed drafts and HEIC inputs for conversion", () => {
    expect(
      validatePrivateMessageImageDraft({
        uri: "file:///tmp/a.jpg",
        mimeType: "image/jpeg",
      }),
    ).toBeNull();
    expect(
      validatePrivateMessageImageDraft({
        uri: "file:///tmp/a.heic",
        mimeType: "image/heic",
      }),
    ).toBeNull();
  });

  it("rejects disallowed mime and oversized blobs", () => {
    expect(
      validatePrivateMessageImageDraft({
        uri: "file:///tmp/a.gif",
        mimeType: "image/gif",
      }),
    ).toMatch(/JPEG, PNG, and WebP/);
    expect(
      validatePrivateMessageImageDraft(
        {
          uri: "file:///tmp/a.jpg",
          mimeType: "image/jpeg",
        },
        PRIVATE_MESSAGE_IMAGE_MAX_BYTES + 1,
      ),
    ).toMatch(/5 MB/);
  });
});

describe("validatePrivateMessageImageDrafts", () => {
  it("enforces the same max count as web", () => {
    const drafts = Array.from({ length: 4 }, (_, index) => ({
      uri: `file:///tmp/${index}.jpg`,
      mimeType: "image/jpeg",
    }));
    expect(validatePrivateMessageImageDrafts(drafts)).toMatch(/up to 3/);
  });
});
