import {
  resolveEffectiveCoverPhotoId,
  sortPhotosByGalleryOrder,
} from "./courseRoundCoverPhoto";
import type { MemberCourseRoundPhotoRecord } from "../types/memberCourseRoundPhoto";

export type ExperienceEditPhoto = {
  id: string;
  previewUrl: string;
  sort_order: number;
  created_at: string;
};

export function mapActivePhotosForExperienceEdit(
  photos: MemberCourseRoundPhotoRecord[],
): ExperienceEditPhoto[] {
  return sortPhotosByGalleryOrder(
    photos.filter(
      (photo) =>
        photo.signed_url &&
        photo.moderation_status === "active" &&
        !photo.hidden_at,
    ),
  ).map((photo) => ({
    id: photo.id,
    previewUrl: photo.signed_url as string,
    sort_order: photo.sort_order,
    created_at: photo.created_at,
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
    user_id: "",
    storage_path: "",
    sort_order: photo.sort_order,
    is_featured: false,
    moderation_status: "active",
    created_at: photo.created_at,
    signed_url: photo.previewUrl,
  }));
}
