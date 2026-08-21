import type { MobileCourseRoundPhoto, MobileCourseRoundRecord, MobileRoundPhotoDraft } from "@/types/courseRoundPhoto";
import { isVideoRoundPhoto } from "../courseRoundCoverPhoto";
import { getCachedSignedUrl, setCachedSignedUrl } from "../signedUrlCache";
import { getCurrentUserId } from "./members";
import { requireSupabase } from "../supabase";

export const COURSE_ROUND_PHOTOS_BUCKET = "course-round-photos";
export const MAX_ROUND_PHOTOS = 8;
const SIGNED_URL_TTL_SECONDS = 3600;

const PHOTO_SELECT_BASE =
  "id, member_course_round_id, user_id, golf_course_id, storage_path, caption, sort_order, width, height, file_size_bytes, mime_type, moderation_status, created_at";
const PHOTO_SELECT_WITH_MEDIA_KIND = `${PHOTO_SELECT_BASE}, media_kind, poster_storage_path`;

function randomUuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function normalizeMediaKind(value: unknown): "image" | "video" {
  return String(value ?? "").toLowerCase() === "video" ? "video" : "image";
}

function normalizePhoto(row: Record<string, unknown>): MobileCourseRoundPhoto {
  return {
    id: String(row.id ?? ""),
    member_course_round_id: String(row.member_course_round_id ?? ""),
    storage_path: String(row.storage_path ?? ""),
    caption: row.caption ? String(row.caption) : null,
    sort_order: Number(row.sort_order ?? 0),
    mime_type: row.mime_type ? String(row.mime_type) : null,
    media_kind: row.media_kind !== undefined ? normalizeMediaKind(row.media_kind) : undefined,
    poster_storage_path: row.poster_storage_path ? String(row.poster_storage_path) : null,
  };
}

function buildStoragePath(userId: string, roundId: string, extension: string) {
  return `${userId}/${roundId}/${randomUuid()}.${extension}`;
}

function extensionFromMime(mimeType: string) {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  return "jpg";
}

export async function createSignedPhotoUrl(storagePath: string) {
  const trimmed = storagePath.trim();
  if (!trimmed) {
    return { url: null, error: new Error("Could not load photo.") };
  }

  const cached = getCachedSignedUrl(COURSE_ROUND_PHOTOS_BUCKET, trimmed);
  if (cached) {
    return { url: cached, error: null };
  }

  const client = requireSupabase();
  const { data, error } = await client.storage
    .from(COURSE_ROUND_PHOTOS_BUCKET)
    .createSignedUrl(trimmed, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    return { url: null, error: error ?? new Error("Could not load photo.") };
  }

  setCachedSignedUrl(COURSE_ROUND_PHOTOS_BUCKET, trimmed, data.signedUrl);
  return { url: data.signedUrl, error: null };
}

export async function fetchPhotosForRoundIds(roundIds: string[]) {
  if (roundIds.length === 0) {
    return { data: [] as MobileCourseRoundPhoto[], error: null };
  }

  const client = requireSupabase();
  let rows: Record<string, unknown>[] | null = null;
  let error: { message: string } | null = null;

  const primary = await client
    .from("member_course_round_photos")
    .select(PHOTO_SELECT_WITH_MEDIA_KIND)
    .in("member_course_round_id", roundIds)
    .eq("moderation_status", "active")
    .is("hidden_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (primary.error) {
    // Older schemas without media_kind / poster_storage_path still work.
    const fallback = await client
      .from("member_course_round_photos")
      .select(PHOTO_SELECT_BASE)
      .in("member_course_round_id", roundIds)
      .eq("moderation_status", "active")
      .is("hidden_at", null)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    rows = (fallback.data ?? null) as Record<string, unknown>[] | null;
    error = fallback.error;
  } else {
    rows = (primary.data ?? null) as Record<string, unknown>[] | null;
    error = null;
  }

  if (error) {
    return { data: [] as MobileCourseRoundPhoto[], error };
  }

  const photos = (rows ?? []).map((row) => normalizePhoto(row));
  const withUrls = await Promise.all(
    photos.map(async (photo) => {
      // Never sign raw video into Image-bound signed_url.
      if (isVideoRoundPhoto(photo)) {
        const posterPath = photo.poster_storage_path?.trim() ?? "";
        if (!posterPath) {
          return { ...photo, signed_url: null };
        }
        const { url } = await createSignedPhotoUrl(posterPath);
        return { ...photo, signed_url: url };
      }

      const { url } = await createSignedPhotoUrl(photo.storage_path);
      return { ...photo, signed_url: url };
    }),
  );

  return { data: withUrls, error: null };
}

export async function attachPhotosToRounds(rounds: MobileCourseRoundRecord[]) {
  if (rounds.length === 0) return rounds;

  const roundIds = rounds.map((round) => round.id);
  const { data: photos } = await fetchPhotosForRoundIds(roundIds);
  const photosByRoundId = new Map<string, MobileCourseRoundPhoto[]>();

  for (const photo of photos ?? []) {
    const existing = photosByRoundId.get(photo.member_course_round_id) ?? [];
    existing.push(photo);
    photosByRoundId.set(photo.member_course_round_id, existing);
  }

  return rounds.map((round) => ({
    ...round,
    photos: photosByRoundId.get(round.id) ?? [],
  }));
}

export async function uploadCourseRoundPhotos(
  roundId: string,
  drafts: MobileRoundPhotoDraft[],
): Promise<{
  data: { uploaded: MobileCourseRoundPhoto[]; failed: Array<{ fileName: string; message: string }> } | null;
  error: Error | null;
}> {
  const { userId, error: sessionError } = await getCurrentUserId();
  if (sessionError || !userId) {
    return { data: null, error: sessionError ?? new Error("You must be signed in.") };
  }

  const client = requireSupabase();
  const uploaded: MobileCourseRoundPhoto[] = [];
  const failed: Array<{ fileName: string; message: string }> = [];

  for (const draft of drafts) {
    try {
      const response = await fetch(draft.uri);
      const blob = await response.blob();
      const extension = extensionFromMime(draft.mimeType);
      const storagePath = buildStoragePath(userId, roundId, extension);

      const { error: uploadError } = await client.storage
        .from(COURSE_ROUND_PHOTOS_BUCKET)
        .upload(storagePath, blob, {
          contentType: draft.mimeType,
          upsert: false,
        });

      if (uploadError) {
        failed.push({ fileName: draft.fileName, message: uploadError.message });
        continue;
      }

      const { data, error: insertError } = await client
        .from("member_course_round_photos")
        .insert({
          member_course_round_id: roundId,
          user_id: userId,
          storage_path: storagePath,
          caption: draft.caption.trim() || null,
          sort_order: draft.sortOrder,
          mime_type: draft.mimeType,
          file_size_bytes: blob.size,
        })
        .select(PHOTO_SELECT_BASE)
        .single();

      if (insertError) {
        await client.storage.from(COURSE_ROUND_PHOTOS_BUCKET).remove([storagePath]);
        failed.push({ fileName: draft.fileName, message: insertError.message });
        continue;
      }

      const photo = normalizePhoto(data as Record<string, unknown>);
      const { url } = await createSignedPhotoUrl(photo.storage_path);
      uploaded.push({ ...photo, signed_url: url });
    } catch (uploadError) {
      failed.push({
        fileName: draft.fileName,
        message: uploadError instanceof Error ? uploadError.message : "Upload failed.",
      });
    }
  }

  return { data: { uploaded, failed }, error: null };
}

export async function fetchCoverPhotoIdsForRoundIds(roundIds: string[]) {
  if (roundIds.length === 0) {
    return { data: new Map<string, string | null>(), error: null };
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("member_course_rounds")
    .select("id, cover_photo_id")
    .in("id", roundIds);

  if (error) {
    const message = (error.message ?? "").toLowerCase();
    if (error.code === "42703" || message.includes("cover_photo_id")) {
      return { data: new Map<string, string | null>(), error: null };
    }
    return { data: null, error };
  }

  const coverIdsByRoundId = new Map<string, string | null>(
    (data ?? []).map((row) => [
      String(row.id),
      row.cover_photo_id ? String(row.cover_photo_id) : null,
    ]),
  );

  return { data: coverIdsByRoundId, error: null };
}

export { buildRoundImageUrls } from "../courseRoundCoverPhoto";

export async function setRoundCoverPhoto(roundId: string, photoId: string) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("set_member_course_round_cover_photo", {
    p_round_id: roundId.trim(),
    p_photo_id: photoId.trim(),
  });

  if (error) {
    return { data: null, error };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return { data: null, error: new Error("Cover photo could not be updated.") };
  }

  return { data: true, error: null };
}
