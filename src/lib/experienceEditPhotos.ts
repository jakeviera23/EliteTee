import {
  resolveEffectiveCoverPhotoId,
  sortPhotosByGalleryOrder,
} from "./courseRoundCoverPhoto";
import { isRoundMediaVideo } from "./memberCourseRoundPhotos";
import type { MemberCourseRoundPhotoRecord } from "../types/memberCourseRoundPhoto";

export type ExperienceEditPhoto = {
  id: string;
  previewUrl: string;
  sort_order: number;
  created_at: string;
  mediaKind?: "image" | "video";
  user_id?: string;
  storage_path?: string;
  poster_storage_path?: string | null;
};

export function mapActivePhotosForExperienceEdit(
  photos: MemberCourseRoundPhotoRecord[],
): ExperienceEditPhoto[] {
  return sortPhotosByGalleryOrder(
    photos.filter(
      (photo) =>
        photo.moderation_status === "active" &&
        !photo.hidden_at &&
        Boolean(photo.id),
    ),
  ).map((photo) => ({
    id: photo.id,
    previewUrl:
      (isRoundMediaVideo(photo)
        ? photo.poster_signed_url || photo.signed_url
        : photo.signed_url) || "",
    sort_order: photo.sort_order,
    created_at: photo.created_at,
    mediaKind: isRoundMediaVideo(photo) ? "video" : "image",
    user_id: photo.user_id,
    storage_path: photo.storage_path,
    poster_storage_path: photo.poster_storage_path,
  }));
}

export function resolveExperienceEditCoverPhotoId(
  coverPhotoId: string | null | undefined,
  photos: ExperienceEditPhoto[],
): string | null {
  const effectiveCoverId = resolveEffectiveCoverPhotoId(coverPhotoId, photos);
  return effectiveCoverId ?? photos[0]?.id ?? null;
}

export function buildExperienceEditPhotoRecords(
  photos: ExperienceEditPhoto[],
  roundId: string,
): MemberCourseRoundPhotoRecord[] {
  return photos.map((photo) => ({
    id: photo.id,
    member_course_round_id: roundId,
    user_id: photo.user_id ?? "",
    storage_path: photo.storage_path ?? "",
    poster_storage_path: photo.poster_storage_path ?? null,
    sort_order: photo.sort_order,
    is_featured: false,
    moderation_status: "active",
    created_at: photo.created_at,
    signed_url: photo.previewUrl,
    poster_signed_url: photo.mediaKind === "video" ? photo.previewUrl : null,
    media_kind: photo.mediaKind ?? "image",
  }));
}
