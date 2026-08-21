import {
  getOversizedRoundPhotoMessage,
  getUnsupportedRoundPhotoMessage,
  isAcceptedRoundPhotoType,
  MAX_ROUND_PHOTO_BYTES,
  MAX_ROUND_PHOTOS,
  processCourseRoundImage,
  type ProcessedCourseRoundImage,
} from "./courseRoundImageProcessing";

export {
  MAX_ROUND_PHOTOS,
  MAX_ROUND_PHOTO_BYTES,
  processCourseRoundImage,
  isAcceptedRoundPhotoType,
  getOversizedRoundPhotoMessage,
  getUnsupportedRoundPhotoMessage,
};
export type { ProcessedCourseRoundImage };

/** Combined photo + video slots per round/experience */
export const MAX_ROUND_MEDIA = MAX_ROUND_PHOTOS;

/** Video upload limits (explicit in UI) */
export const MAX_ROUND_VIDEO_BYTES = 100 * 1024 * 1024;
export const MAX_ROUND_VIDEO_DURATION_SECONDS = 60;

const ACCEPTED_VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

export type RoundMediaKind = "image" | "video";

export type ProcessedCourseRoundVideo = {
  kind: "video";
  blob: Blob;
  mimeType: string;
  extension: "mp4" | "mov" | "webm";
  fileSizeBytes: number;
  durationSeconds: number;
  width: number | null;
  height: number | null;
  poster: ProcessedCourseRoundImage | null;
};

export function isAcceptedRoundVideoType(file: File) {
  const mime = file.type.toLowerCase();
  if (ACCEPTED_VIDEO_MIME_TYPES.has(mime)) return true;
  const lowerName = file.name.toLowerCase();
  return (
    lowerName.endsWith(".mp4") ||
    lowerName.endsWith(".mov") ||
    lowerName.endsWith(".webm")
  );
}

export function isAcceptedRoundMediaType(file: File) {
  return isAcceptedRoundPhotoType(file) || isAcceptedRoundVideoType(file);
}

export function detectRoundMediaKind(file: File): RoundMediaKind {
  return isAcceptedRoundVideoType(file) ? "video" : "image";
}

export function getUnsupportedRoundMediaMessage(file: File) {
  if (isAcceptedRoundVideoType(file) || isAcceptedRoundPhotoType(file)) {
    return `${file.name}: Unsupported media.`;
  }
  const mime = file.type.toLowerCase();
  if (mime.startsWith("video/")) {
    return `${file.name}: Only MP4, MOV, and WebM videos are supported.`;
  }
  return getUnsupportedRoundPhotoMessage(file);
}

export function getOversizedRoundMediaMessage(file: File) {
  if (isAcceptedRoundVideoType(file)) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return `${file.name}: File is ${sizeMb} MB. Maximum size is 100 MB per video.`;
  }
  return getOversizedRoundPhotoMessage(file);
}

export function getRoundMediaLimitsHelpText() {
  return `Up to ${MAX_ROUND_MEDIA} photos or videos. Photos: JPEG/PNG/WebP, 12 MB each. Videos: MP4/MOV/WebM, up to 100 MB and ${MAX_ROUND_VIDEO_DURATION_SECONDS} seconds.`;
}

function extensionForVideo(file: File): "mp4" | "mov" | "webm" {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".mov") || file.type === "video/quicktime") return "mov";
  if (lower.endsWith(".webm") || file.type === "video/webm") return "webm";
  return "mp4";
}

function loadVideoMetadata(file: File): Promise<{
  durationSeconds: number;
  width: number;
  height: number;
  objectUrl: string;
  video: HTMLVideoElement;
}> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const cleanup = () => {
      video.removeAttribute("src");
      video.load();
    };

    video.onloadedmetadata = () => {
      const durationSeconds = Number.isFinite(video.duration) ? video.duration : 0;
      resolve({
        durationSeconds,
        width: video.videoWidth || 0,
        height: video.videoHeight || 0,
        objectUrl,
        video,
      });
    };

    video.onerror = () => {
      cleanup();
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Could not read ${file.name}. Try MP4 or MOV.`));
    };

    video.src = objectUrl;
  });
}

async function captureVideoPoster(
  video: HTMLVideoElement,
  objectUrl: string,
): Promise<ProcessedCourseRoundImage | null> {
  try {
    const seekTo = Math.min(0.25, Math.max(0, (video.duration || 1) * 0.05));
    await new Promise<void>((resolve, reject) => {
      const onSeeked = () => {
        video.removeEventListener("seeked", onSeeked);
        resolve();
      };
      video.addEventListener("seeked", onSeeked);
      try {
        video.currentTime = seekTo;
      } catch {
        video.removeEventListener("seeked", onSeeked);
        reject(new Error("Could not seek video for poster."));
      }
    });

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const canvas = document.createElement("canvas");
    const maxEdge = 1280;
    const scale = Math.min(1, maxEdge / Math.max(width, height));
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), "image/jpeg", 0.82);
    });
    if (!blob) return null;

    return {
      blob,
      mimeType: "image/jpeg",
      extension: "jpg",
      width: canvas.width,
      height: canvas.height,
      fileSizeBytes: blob.size,
    };
  } catch {
    return null;
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(objectUrl);
  }
}

export async function processCourseRoundVideo(file: File): Promise<ProcessedCourseRoundVideo> {
  if (file.size > MAX_ROUND_VIDEO_BYTES) {
    throw new Error(getOversizedRoundMediaMessage(file));
  }
  if (!isAcceptedRoundVideoType(file)) {
    throw new Error(getUnsupportedRoundMediaMessage(file));
  }

  const meta = await loadVideoMetadata(file);
  if (meta.durationSeconds > MAX_ROUND_VIDEO_DURATION_SECONDS + 0.5) {
    meta.video.removeAttribute("src");
    meta.video.load();
    URL.revokeObjectURL(meta.objectUrl);
    throw new Error(
      `${file.name}: Video is ${Math.ceil(meta.durationSeconds)}s. Maximum length is ${MAX_ROUND_VIDEO_DURATION_SECONDS} seconds.`,
    );
  }

  const poster = await captureVideoPoster(meta.video, meta.objectUrl);

  return {
    kind: "video",
    blob: file,
    mimeType: file.type || "video/mp4",
    extension: extensionForVideo(file),
    fileSizeBytes: file.size,
    durationSeconds: Math.round(meta.durationSeconds * 10) / 10,
    width: meta.width || null,
    height: meta.height || null,
    poster,
  };
}
