import type { MobileCourseRoundPhoto } from "@/types/courseRoundPhoto";

type SortablePhoto = Pick<MobileCourseRoundPhoto, "id" | "sort_order"> & {
  created_at?: string;
};

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
    .map((photo) => photo.signed_url)
    .filter((url): url is string => Boolean(url));
}
