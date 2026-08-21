import type { MemberCourseRoundPhotoRecord } from "../types/memberCourseRoundPhoto";

type SortablePhoto = Pick<MemberCourseRoundPhotoRecord, "id" | "sort_order" | "created_at">;

export function sortPhotosByGalleryOrder<T extends SortablePhoto>(photos: T[]): T[] {
  return [...photos].sort(
    (left, right) =>
      left.sort_order - right.sort_order || left.created_at.localeCompare(right.created_at),
  );
}

export function resolveEffectiveCoverPhotoId(
  coverPhotoId: string | null | undefined,
  photos: SortablePhoto[],
): string | null {
  if (!coverPhotoId) return null;
  return photos.some((photo) => photo.id === coverPhotoId) ? coverPhotoId : null;
}

export function orderPhotosWithCoverFirst<T extends SortablePhoto>(
  photos: T[],
  coverPhotoId?: string | null,
): T[] {
  const sorted = sortPhotosByGalleryOrder(photos);
  if (sorted.length <= 1) return sorted;

  const effectiveCoverId = resolveEffectiveCoverPhotoId(coverPhotoId, sorted);
  if (!effectiveCoverId) return sorted;

  const coverIndex = sorted.findIndex((photo) => photo.id === effectiveCoverId);
  if (coverIndex <= 0) return sorted;

  const coverPhoto = sorted[coverIndex];
  const remaining = sorted.filter((_, index) => index !== coverIndex);
  return [coverPhoto, ...remaining];
}

export function photoUrlsFromOrderedPhotos(photos: MemberCourseRoundPhotoRecord[]): string[] {
  return photos
    .map((photo) => {
      if (photo.media_kind === "video" || photo.mime_type?.toLowerCase().startsWith("video/")) {
        return photo.poster_signed_url || photo.signed_url || null;
      }
      return photo.signed_url || null;
    })
    .filter((url): url is string => Boolean(url));
}
