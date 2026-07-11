export const MAX_ROUND_PHOTOS = 10;
export const MAX_ROUND_PHOTO_BYTES = 12 * 1024 * 1024;
export const TARGET_LONG_EDGE_PX = 2000;

const ACCEPTED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const HEIC_MIME_TYPES = new Set(["image/heic", "image/heif"]);

export type ProcessedCourseRoundImage = {
  blob: Blob;
  mimeType: "image/jpeg" | "image/webp";
  extension: "jpg" | "webp";
  width: number;
  height: number;
  fileSizeBytes: number;
};

export function isAcceptedRoundPhotoType(file: File) {
  const mime = file.type.toLowerCase();
  if (ACCEPTED_MIME_TYPES.has(mime)) return true;
  if (HEIC_MIME_TYPES.has(mime)) return false;
  const lowerName = file.name.toLowerCase();
  return (
    lowerName.endsWith(".jpg") ||
    lowerName.endsWith(".jpeg") ||
    lowerName.endsWith(".png") ||
    lowerName.endsWith(".webp")
  );
}

export function getUnsupportedRoundPhotoMessage(file: File) {
  const mime = file.type.toLowerCase();
  if (HEIC_MIME_TYPES.has(mime) || file.name.toLowerCase().endsWith(".heic")) {
    return `${file.name}: HEIC is not supported in this browser. Please export as JPEG, PNG, or WebP.`;
  }
  return `${file.name}: Only JPEG, PNG, and WebP images are supported.`;
}

export function getOversizedRoundPhotoMessage(file: File) {
  const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
  return `${file.name}: File is ${sizeMb} MB. Maximum size is 12 MB per photo.`;
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not read ${file.name}. Try JPEG, PNG, or WebP.`));
    };

    image.src = url;
  });
}

function scaleDimensions(width: number, height: number, maxLongEdge: number) {
  const longEdge = Math.max(width, height);
  if (longEdge <= maxLongEdge) {
    return { width, height };
  }

  const scale = maxLongEdge / longEdge;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: "image/jpeg" | "image/webp",
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Image compression failed."));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}

export async function processCourseRoundImage(
  file: File,
  maxLongEdge = TARGET_LONG_EDGE_PX,
): Promise<ProcessedCourseRoundImage> {
  if (file.size > MAX_ROUND_PHOTO_BYTES) {
    throw new Error(getOversizedRoundPhotoMessage(file));
  }

  if (!isAcceptedRoundPhotoType(file)) {
    throw new Error(getUnsupportedRoundPhotoMessage(file));
  }

  const image = await loadImageFromFile(file);
  const { width, height } = scaleDimensions(image.naturalWidth, image.naturalHeight, maxLongEdge);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Image processing is unavailable in this browser.");
  }

  context.drawImage(image, 0, 0, width, height);

  const preferWebp = typeof canvas.toDataURL("image/webp").startsWith("data:image/webp");
  const mimeType: "image/jpeg" | "image/webp" = preferWebp ? "image/webp" : "image/jpeg";
  const extension: "jpg" | "webp" = preferWebp ? "webp" : "jpg";
  const quality = preferWebp ? 0.82 : 0.85;
  const blob = await canvasToBlob(canvas, mimeType, quality);

  return {
    blob,
    mimeType,
    extension,
    width,
    height,
    fileSizeBytes: blob.size,
  };
}
