export const PRIVATE_MESSAGE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const PRIVATE_MESSAGE_IMAGE_MAX_COUNT = 3;
export const PRIVATE_MESSAGE_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type PrivateMessageImageMimeType = (typeof PRIVATE_MESSAGE_IMAGE_MIME_TYPES)[number];

export type MobilePrivateMessageImageDraft = {
  uri: string;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  fileName?: string | null;
};

export function extensionForPrivateMessageImageMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

/** Normalize picker MIME (incl. HEIC → jpeg after Expo quality compression). */
export function normalizePrivateMessageImageMime(
  mimeType?: string | null,
  fileName?: string | null,
): string {
  const raw = (mimeType ?? "").toLowerCase().trim();
  if (raw === "image/jpg" || raw === "image/jpeg") return "image/jpeg";
  if (raw === "image/png") return "image/png";
  if (raw === "image/webp") return "image/webp";
  if (raw.includes("heic") || raw.includes("heif")) return "image/jpeg";

  const name = (fileName ?? "").toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  ) {
    return "image/jpeg";
  }

  return raw || "image/jpeg";
}

export function isAllowedPrivateMessageImageMime(
  mime: string,
): mime is PrivateMessageImageMimeType {
  return (PRIVATE_MESSAGE_IMAGE_MIME_TYPES as readonly string[]).includes(mime);
}

export function validatePrivateMessageImageDraft(
  draft: MobilePrivateMessageImageDraft,
  byteSize?: number,
): string | null {
  const mime = normalizePrivateMessageImageMime(draft.mimeType, draft.fileName);
  if (!isAllowedPrivateMessageImageMime(mime)) {
    return "Only JPEG, PNG, and WebP images are allowed.";
  }
  if (typeof byteSize === "number") {
    if (byteSize <= 0) {
      return "This image file is empty.";
    }
    if (byteSize > PRIVATE_MESSAGE_IMAGE_MAX_BYTES) {
      return "Each image must be 5 MB or smaller.";
    }
  }
  if (!draft.uri.trim()) {
    return "Image is missing.";
  }
  return null;
}

export function validatePrivateMessageImageDrafts(
  drafts: MobilePrivateMessageImageDraft[],
): string | null {
  if (drafts.length === 0) return null;
  if (drafts.length > PRIVATE_MESSAGE_IMAGE_MAX_COUNT) {
    return "You can attach up to 3 images.";
  }
  for (const draft of drafts) {
    const error = validatePrivateMessageImageDraft(draft);
    if (error) return error;
  }
  return null;
}
