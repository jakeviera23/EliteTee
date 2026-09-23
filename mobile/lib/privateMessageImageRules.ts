export const PRIVATE_MESSAGE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const PRIVATE_MESSAGE_IMAGE_MAX_COUNT = 3;
export const PRIVATE_MESSAGE_IMAGE_MAX_EDGE_PX = 1800;
export const PRIVATE_MESSAGE_IMAGE_COMPRESS_QUALITIES = [0.8, 0.65, 0.5] as const;
export const PRIVATE_MESSAGE_IMAGE_TOO_LARGE_AFTER_COMPRESS =
  "This photo is still too large after compression. Please choose a smaller image.";
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

export type PrivateMessageImageResizeTarget = {
  width: number;
  height: number;
};

export function extensionForPrivateMessageImageMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

export function isHeicLikePrivateMessageImage(
  mimeType?: string | null,
  fileName?: string | null,
): boolean {
  const raw = (mimeType ?? "").toLowerCase().trim();
  if (raw.includes("heic") || raw.includes("heif")) return true;
  const name = (fileName ?? "").toLowerCase();
  return name.endsWith(".heic") || name.endsWith(".heif");
}

/** Normalize picker MIME (incl. HEIC → jpeg). */
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

export function longestPrivateMessageImageEdge(
  width?: number | null,
  height?: number | null,
): number | null {
  if (
    typeof width !== "number" ||
    typeof height !== "number" ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return null;
  }
  return Math.max(width, height);
}

/**
 * Scale so the longest edge is at most maxEdge. Null means no resize needed
 * (or dimensions are unknown — caller may still compress).
 */
export function computePrivateMessageImageResize(
  width?: number | null,
  height?: number | null,
  maxEdge: number = PRIVATE_MESSAGE_IMAGE_MAX_EDGE_PX,
): PrivateMessageImageResizeTarget | null {
  const longest = longestPrivateMessageImageEdge(width, height);
  if (longest == null || longest <= maxEdge) {
    return null;
  }

  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round((width as number) * scale)),
    height: Math.max(1, Math.round((height as number) * scale)),
  };
}

export function acceptsPrivateMessageImageByteSize(
  byteSize: number,
  maxBytes: number = PRIVATE_MESSAGE_IMAGE_MAX_BYTES,
): boolean {
  return Number.isFinite(byteSize) && byteSize > 0 && byteSize <= maxBytes;
}

/**
 * Skip re-encoding when the original is already an allowed, under-limit image
 * that does not need HEIC conversion or downscaling.
 */
export function shouldPreprocessPrivateMessageImage({
  byteSize,
  mimeType,
  fileName,
  width,
  height,
}: {
  byteSize: number;
  mimeType?: string | null;
  fileName?: string | null;
  width?: number | null;
  height?: number | null;
}): boolean {
  if (isHeicLikePrivateMessageImage(mimeType, fileName)) {
    return true;
  }

  if (!acceptsPrivateMessageImageByteSize(byteSize)) {
    return true;
  }

  const longest = longestPrivateMessageImageEdge(width, height);
  if (longest != null && longest > PRIVATE_MESSAGE_IMAGE_MAX_EDGE_PX) {
    return true;
  }

  return false;
}

export function privateMessageImageCompressQualityAt(attemptIndex: number): number | null {
  return PRIVATE_MESSAGE_IMAGE_COMPRESS_QUALITIES[attemptIndex] ?? null;
}

export function buildPrivateMessageImageManipulatorActions({
  width,
  height,
}: {
  width?: number | null;
  height?: number | null;
}): Array<{ resize: { width: number; height: number } }> {
  const resize = computePrivateMessageImageResize(width, height);
  if (!resize) {
    return [];
  }
  return [{ resize: { width: resize.width, height: resize.height } }];
}

export function validatePrivateMessageImageDraft(
  draft: MobilePrivateMessageImageDraft,
  byteSize?: number,
): string | null {
  if (!isHeicLikePrivateMessageImage(draft.mimeType, draft.fileName)) {
    const mime = normalizePrivateMessageImageMime(draft.mimeType, draft.fileName);
    if (!isAllowedPrivateMessageImageMime(mime)) {
      return "Only JPEG, PNG, and WebP images are allowed.";
    }
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

/**
 * Normalize an expo-image-picker asset into a private-message image draft.
 * Keeps the picker MIME/fileName intact so HEIC detection still works in preprocess.
 * Video is rejected — DM attachments only support images today.
 */
export function draftFromPrivateMessageImagePickerAsset(asset: {
  uri?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
  width?: number | null;
  height?: number | null;
  type?: string | null;
}): { draft: MobilePrivateMessageImageDraft } | { error: string } {
  const assetType = (asset.type ?? "").toLowerCase();
  if (assetType === "video" || assetType.includes("video")) {
    return { error: "Only photos can be attached right now." };
  }

  const uri = (asset.uri ?? "").trim();
  if (!uri) {
    return { error: "Could not read the selected photo. Please try another image." };
  }

  const draft: MobilePrivateMessageImageDraft = {
    uri,
    // Preserve raw MIME (incl. HEIC). Do not normalize to jpeg here — that would
    // hide HEIC when fileName is missing and skip required preprocess.
    mimeType: asset.mimeType ?? null,
    width: asset.width ?? null,
    height: asset.height ?? null,
    fileName: asset.fileName ?? null,
  };

  const validationError = validatePrivateMessageImageDraft(draft);
  if (validationError) {
    return { error: validationError };
  }

  return { draft };
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
