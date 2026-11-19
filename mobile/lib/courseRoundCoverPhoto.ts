import type { MobileCourseRoundPhoto } from "@/types/courseRoundPhoto";

type SortablePhoto = Pick<MobileCourseRoundPhoto, "id" | "sort_order"> & {
  created_at?: string;
};

const VIDEO_EXTENSIONS = /\.(mp4|mov|m4v|webm|avi)(\?|$)/i;

export function isVideoRoundPhoto(
  photo: Pick<MobileCourseRoundPhoto, "media_kind" | "mime_type" | "storage_path">,
): boolean {
  if (photo.media_kind === "video") return true;
  if (photo.mime_type?.toLowerCase().startsWith("video/")) return true;
  return VIDEO_EXTENSIONS.test(photo.storage_path ?? "");
}

/**
 * Mobile V1 galleries are image-only.
 * Video rows are skipped unless a signed poster URL is available.
 * Never pass raw video URLs into React Native <Image>.
 */
export function galleryDisplayUrl(
  photo: Pick<MobileCourseRoundPhoto, "media_kind" | "mime_type" | "storage_path" | "signed_url">,
): string | null {
  const url = photo.signed_url?.trim() ?? "";
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) return null;
  if (isVideoRoundPhoto(photo) && VIDEO_EXTENSIONS.test(url)) {
    return null;
  }
  return url;
}

export function orderPhotosWithCoverFirst<T extends SortablePhoto>(
  photos: T[],
  coverPhotoId?: string | null,
): T[] {
  const sorted = [...photos].sort((left, right) => left.sort_order - right.sort_order);
  if (sorted.length <= 1) return sorted;
  if (!coverPhotoId) return sorted;

  const coverIndex = sorted.findIndex((photo) => photo.id === coverPhotoId);
  if (coverIndex <= 0) return sorted;

  const coverPhoto = sorted[coverIndex];
  const remaining = sorted.filter((_, index) => index !== coverIndex);
  return [coverPhoto, ...remaining];
}

export function buildRoundImageUrls(
  photos: MobileCourseRoundPhoto[],
  coverPhotoId?: string | null,
): string[] {
  return orderPhotosWithCoverFirst(photos, coverPhotoId)
    .map((photo) => galleryDisplayUrl(photo))
    .filter((url): url is string => Boolean(url));
}
