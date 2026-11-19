import { Image } from "react-native";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import {
  acceptsPrivateMessageImageByteSize,
  buildPrivateMessageImageManipulatorActions,
  isAllowedPrivateMessageImageMime,
  longestPrivateMessageImageEdge,
  normalizePrivateMessageImageMime,
  PRIVATE_MESSAGE_IMAGE_COMPRESS_QUALITIES,
  PRIVATE_MESSAGE_IMAGE_TOO_LARGE_AFTER_COMPRESS,
  shouldPreprocessPrivateMessageImage,
  type MobilePrivateMessageImageDraft,
} from "../privateMessageImageRules";

export type PreparedPrivateMessageImage = {
  uri: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  byteSize: number;
};

async function readLocalImageByteSize(uri: string): Promise<number> {
  const response = await fetch(uri);
  const blob = await response.blob();
  return blob.size;
}

async function readLocalImageDimensions(
  uri: string,
): Promise<{ width: number; height: number } | null> {
  return await new Promise((resolve) => {
    Image.getSize(
      uri,
      (width, height) => {
        if (
          typeof width === "number" &&
          typeof height === "number" &&
          width > 0 &&
          height > 0
        ) {
          resolve({ width, height });
          return;
        }
        resolve(null);
      },
      () => resolve(null),
    );
  });
}

/**
 * Resize/compress ordinary iPhone photos so they fit the 5 MB private-message
 * bucket limit. Already-small allowed images skip re-encoding. HEIC/HEIF always
 * convert to JPEG. Expo ImageManipulator applies EXIF orientation on decode.
 */
export async function preparePrivateMessageImageForUpload(
  draft: MobilePrivateMessageImageDraft,
): Promise<PreparedPrivateMessageImage> {
  const sourceUri = draft.uri.trim();
  if (!sourceUri) {
    throw new Error("Image is missing.");
  }

  const originalByteSize = await readLocalImageByteSize(sourceUri);
  if (originalByteSize <= 0) {
    throw new Error("This image file is empty.");
  }

  const normalizedMime = normalizePrivateMessageImageMime(draft.mimeType, draft.fileName);

  let width = draft.width ?? null;
  let height = draft.height ?? null;
  if (longestPrivateMessageImageEdge(width, height) == null) {
    const measured = await readLocalImageDimensions(sourceUri);
    if (measured) {
      width = measured.width;
      height = measured.height;
    }
  }

  if (
    !shouldPreprocessPrivateMessageImage({
      byteSize: originalByteSize,
      mimeType: draft.mimeType,
      fileName: draft.fileName,
      width,
      height,
    })
  ) {
    if (!isAllowedPrivateMessageImageMime(normalizedMime)) {
      throw new Error("Only JPEG, PNG, and WebP images are allowed.");
    }
    return {
      uri: sourceUri,
      mimeType: normalizedMime,
      width,
      height,
      byteSize: originalByteSize,
    };
  }

  // Resize only when both dimensions are known (longest-edge aware).
  // If still unknown, skip resize and rely on JPEG conversion/compression.
  const actions = buildPrivateMessageImageManipulatorActions({ width, height });

  for (const quality of PRIVATE_MESSAGE_IMAGE_COMPRESS_QUALITIES) {
    const result = await manipulateAsync(sourceUri, actions, {
      compress: quality,
      format: SaveFormat.JPEG,
    });
    const byteSize = await readLocalImageByteSize(result.uri);
    if (acceptsPrivateMessageImageByteSize(byteSize)) {
      return {
        uri: result.uri,
        mimeType: "image/jpeg",
        width: result.width ?? width,
        height: result.height ?? height,
        byteSize,
      };
    }
  }

  throw new Error(PRIVATE_MESSAGE_IMAGE_TOO_LARGE_AFTER_COMPRESS);
}
