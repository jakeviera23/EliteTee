import { describe, expect, it } from "vitest";
import {
  normalizePrivateMessageImageMime,
  PRIVATE_MESSAGE_IMAGE_MAX_BYTES,
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

describe("validatePrivateMessageImageDraft", () => {
  it("accepts allowed drafts", () => {
    expect(
      validatePrivateMessageImageDraft({
        uri: "file:///tmp/a.jpg",
        mimeType: "image/jpeg",
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
