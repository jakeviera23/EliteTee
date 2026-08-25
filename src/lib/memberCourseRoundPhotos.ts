import type {
  CourseRoundMediaKind,
  CourseRoundPhotoUploadResult,
  MemberCourseRoundPhotoRecord,
} from "../types/memberCourseRoundPhoto";
import type { FeedMediaItem } from "../data/portalSocial";
import {
  orderPhotosWithCoverFirst,
  photoUrlsFromOrderedPhotos,
  pickListCoverPhoto,
} from "./courseRoundCoverPhoto";
import type { ProcessedCourseRoundImage } from "./courseRoundImageProcessing";
import { processCourseRoundImage } from "./courseRoundImageProcessing";
import {
  detectRoundMediaKind,
  processCourseRoundVideo,
  type ProcessedCourseRoundVideo,
} from "./courseRoundMediaProcessing";
import { getCurrentAuthUserId } from "./authUserLinking";
import { logSupabaseOperation } from "./supabaseOperationLog";
import { supabase } from "./supabase";

export const COURSE_ROUND_PHOTOS_BUCKET = "course-round-photos";
const SIGNED_URL_TTL_SECONDS = 3600;
const SIGNED_URL_REFRESH_BUFFER_MS = 5 * 60 * 1000;

type SignedUrlCacheEntry = {
  url: string;
  expiresAt: number;
};

const signedUrlCache = new Map<string, SignedUrlCacheEntry>();

const PHOTO_SELECT =
  "id, member_course_round_id, user_id, golf_course_id, storage_path, caption, sort_order, width, height, file_size_bytes, mime_type, media_kind, duration_seconds, poster_storage_path, is_featured, moderation_status, hidden_at, hidden_reason, created_at";

const PHOTO_SELECT_LEGACY =
  "id, member_course_round_id, user_id, golf_course_id, storage_path, caption, sort_order, width, height, file_size_bytes, mime_type, is_featured, moderation_status, hidden_at, hidden_reason, created_at";

function normalizeMediaKind(value: unknown): CourseRoundMediaKind {
  return value === "video" ? "video" : "image";
}

export function isRoundMediaVideo(photo: Pick<MemberCourseRoundPhotoRecord, "media_kind" | "mime_type">) {
  if (photo.media_kind === "video") return true;
  return Boolean(photo.mime_type?.toLowerCase().startsWith("video/"));
}

function normalizePhoto(row: Record<string, unknown>): MemberCourseRoundPhotoRecord {
  return {
    id: String(row.id ?? ""),
    member_course_round_id: String(row.member_course_round_id ?? ""),
    user_id: String(row.user_id ?? ""),
    golf_course_id: row.golf_course_id ? String(row.golf_course_id) : null,
    storage_path: String(row.storage_path ?? ""),
    caption: row.caption ? String(row.caption) : null,
    sort_order: Number(row.sort_order ?? 0),
    width: row.width === null || row.width === undefined ? null : Number(row.width),
    height: row.height === null || row.height === undefined ? null : Number(row.height),
    file_size_bytes:
      row.file_size_bytes === null || row.file_size_bytes === undefined
        ? null
        : Number(row.file_size_bytes),
    mime_type: row.mime_type ? String(row.mime_type) : null,
    media_kind: normalizeMediaKind(row.media_kind),
    duration_seconds:
      row.duration_seconds === null || row.duration_seconds === undefined
        ? null
        : Number(row.duration_seconds),
    poster_storage_path: row.poster_storage_path ? String(row.poster_storage_path) : null,
    is_featured: Boolean(row.is_featured),
    moderation_status: String(row.moderation_status ?? "active"),
    hidden_at: row.hidden_at ? String(row.hidden_at) : null,
    hidden_reason: row.hidden_reason ? String(row.hidden_reason) : null,
    created_at: String(row.created_at ?? ""),
  };
}

export function mediaItemsFromPhotos(photos: MemberCourseRoundPhotoRecord[]): FeedMediaItem[] {
  return photos
    .filter((photo) => photo.signed_url)
    .map((photo) => ({
      id: photo.id,
      url: photo.signed_url as string,
      kind: isRoundMediaVideo(photo) ? "video" : "image",
      posterUrl: photo.poster_signed_url ?? null,
      mimeType: photo.mime_type ?? null,
      caption: photo.caption ?? null,
    }));
}

/** Prefer poster for videos so legacy image-only surfaces stay valid. */
export function displayUrlsFromPhotos(photos: MemberCourseRoundPhotoRecord[]): string[] {
  return photos
    .map((photo) => {
      if (isRoundMediaVideo(photo)) {
        return photo.poster_signed_url || photo.signed_url || null;
      }
      return photo.signed_url || null;
    })
    .filter((url): url is string => Boolean(url));
}

function buildStoragePath(userId: string, roundId: string, extension: string) {
  const fileId = crypto.randomUUID();
  return `${userId}/${roundId}/${fileId}.${extension}`;
}

export async function createSignedPhotoUrl(storagePath: string) {
  if (!supabase) {
    return { url: null, error: new Error("Supabase is not configured.") };
  }

  const cached = signedUrlCache.get(storagePath);
  if (cached && cached.expiresAt > Date.now() + SIGNED_URL_REFRESH_BUFFER_MS) {
    return { url: cached.url, error: null };
  }

  const { data, error } = await supabase.storage
    .from(COURSE_ROUND_PHOTOS_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    signedUrlCache.delete(storagePath);
    return {
      url: null,
      error: error ?? new Error("Could not load this photo. It may have been removed."),
    };
  }

  signedUrlCache.set(storagePath, {
    url: data.signedUrl,
    expiresAt: Date.now() + SIGNED_URL_TTL_SECONDS * 1000,
  });

  return { url: data.signedUrl, error: null };
}

export async function attachSignedUrls(photos: MemberCourseRoundPhotoRecord[]) {
  const withUrls = await Promise.all(
    photos.map(async (photo) => {
      const { url } = await createSignedPhotoUrl(photo.storage_path);
      let posterUrl: string | null = null;
      if (photo.poster_storage_path) {
        const poster = await createSignedPhotoUrl(photo.poster_storage_path);
        posterUrl = poster.url;
      }
      return { ...photo, signed_url: url, poster_signed_url: posterUrl };
    }),
  );

  return withUrls;
}

export async function fetchListCoverPhotosForRoundIds(roundIds: string[]) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  if (roundIds.length === 0) {
    return { data: new Map<string, MemberCourseRoundPhotoRecord[]>(), error: null };
  }

  const { data: coverPhotoIdsByRoundId, error: coverError } =
    await fetchCoverPhotoIdsForRoundIds(roundIds);
  if (coverError) {
    return { data: null, error: coverError };
  }

  const coverMap = coverPhotoIdsByRoundId ?? new Map<string, string | null>();
  const explicitCoverIds = [
    ...new Set(
      roundIds
        .map((roundId) => coverMap.get(roundId))
        .filter((photoId): photoId is string => Boolean(photoId)),
    ),
  ];

  let coverPhotosById = new Map<string, MemberCourseRoundPhotoRecord>();
  if (explicitCoverIds.length > 0) {
    const { data, error } = await supabase
      .from("member_course_round_photos")
      .select(PHOTO_SELECT)
      .in("id", explicitCoverIds)
      .eq("moderation_status", "active")
      .is("hidden_at", null);

    if (error) {
      return { data: null, error };
    }

    coverPhotosById = new Map(
      (data ?? []).map((row) => {
        const photo = normalizePhoto(row as Record<string, unknown>);
        return [photo.id, photo] as const;
      }),
    );
  }

  const coverPhotoByRoundId = new Map<string, MemberCourseRoundPhotoRecord>();
  for (const roundId of roundIds) {
    const coverId = coverMap.get(roundId);
    if (!coverId) continue;
    const photo = coverPhotosById.get(coverId);
    if (photo) {
      coverPhotoByRoundId.set(roundId, photo);
    }
  }

  const roundsNeedingFallback = roundIds.filter((roundId) => !coverPhotoByRoundId.has(roundId));
  const fallbackPhotoByRoundId = new Map<string, MemberCourseRoundPhotoRecord>();

  if (roundsNeedingFallback.length > 0) {
    const { data, error } = await supabase
      .from("member_course_round_photos")
      .select(PHOTO_SELECT)
      .in("member_course_round_id", roundsNeedingFallback)
      .eq("moderation_status", "active")
      .is("hidden_at", null)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      return { data: null, error };
    }

    const photosByRoundId = new Map<string, MemberCourseRoundPhotoRecord[]>();
    for (const row of data ?? []) {
      const photo = normalizePhoto(row as Record<string, unknown>);
      const existing = photosByRoundId.get(photo.member_course_round_id) ?? [];
      existing.push(photo);
      photosByRoundId.set(photo.member_course_round_id, existing);
    }

    for (const roundId of roundsNeedingFallback) {
      const roundPhotos = photosByRoundId.get(roundId) ?? [];
      const picked = pickListCoverPhoto(roundPhotos, null);
      if (picked) {
        fallbackPhotoByRoundId.set(roundId, picked);
      }
    }
  }

  const photosToSign: MemberCourseRoundPhotoRecord[] = [];
  for (const roundId of roundIds) {
    const photo = coverPhotoByRoundId.get(roundId) ?? fallbackPhotoByRoundId.get(roundId);
    if (photo) {
      photosToSign.push(photo);
    }
  }

  const signedPhotos = await attachSignedUrls(photosToSign);
  const signedById = new Map(signedPhotos.map((photo) => [photo.id, photo]));
  const result = new Map<string, MemberCourseRoundPhotoRecord[]>();

  for (const roundId of roundIds) {
    const photo = coverPhotoByRoundId.get(roundId) ?? fallbackPhotoByRoundId.get(roundId);
    if (!photo) {
      result.set(roundId, []);
      continue;
    }

    const signedPhoto = signedById.get(photo.id);
    const hasDisplayUrl = Boolean(signedPhoto?.signed_url || signedPhoto?.poster_signed_url);
    result.set(roundId, hasDisplayUrl && signedPhoto ? [signedPhoto] : []);
  }

  return { data: result, error: null };
}

export async function fetchActivePhotoCountsForRoundIds(roundIds: string[]) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  if (roundIds.length === 0) {
    return { data: new Map<string, number>(), error: null };
  }

  const { data, error } = await supabase
    .from("member_course_round_photos")
    .select("id, member_course_round_id")
    .in("member_course_round_id", roundIds)
    .eq("moderation_status", "active")
    .is("hidden_at", null);

  if (error) {
    return { data: null, error };
  }

  const countsByRoundId = new Map<string, number>();
  for (const roundId of roundIds) {
    countsByRoundId.set(roundId, 0);
  }

  for (const row of data ?? []) {
    const roundId = String(row.member_course_round_id ?? "");
    if (!roundId) continue;
    countsByRoundId.set(roundId, (countsByRoundId.get(roundId) ?? 0) + 1);
  }

  return { data: countsByRoundId, error: null };
}

export async function fetchPhotosForRoundIds(roundIds: string[]) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  if (roundIds.length === 0) {
    return { data: [] as MemberCourseRoundPhotoRecord[], error: null };
  }

  const primary = await supabase
    .from("member_course_round_photos")
    .select(PHOTO_SELECT)
    .in("member_course_round_id", roundIds)
    .eq("moderation_status", "active")
    .is("hidden_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  let rows: Record<string, unknown>[] | null = (primary.data as Record<string, unknown>[] | null) ?? null;
  let error = primary.error;

  if (error) {
    // Prefer legacy columns when migration 060 is not applied (or schema cache is stale).
    const legacy = await supabase
      .from("member_course_round_photos")
      .select(PHOTO_SELECT_LEGACY)
      .in("member_course_round_id", roundIds)
      .eq("moderation_status", "active")
      .is("hidden_at", null)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    rows = (legacy.data as Record<string, unknown>[] | null) ?? null;
    error = legacy.error;
    if (error) {
      logSupabaseOperation("fetchPhotosForRoundIds", error, { roundIds });
      return { data: null, error };
    }
  }

  const photos = (rows ?? []).map((row) => normalizePhoto(row));
  const withUrls = await attachSignedUrls(photos);
  return { data: withUrls, error: null };
}

export async function fetchPhotosForGolfCourse(golfCourseId: string, limit = 48) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const { data, error } = await supabase
    .from("member_course_round_photos")
    .select(PHOTO_SELECT)
    .eq("golf_course_id", golfCourseId)
    .eq("moderation_status", "active")
    .is("hidden_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { data: null, error };
  }

  const photos = (data ?? []).map((row) => normalizePhoto(row as Record<string, unknown>));
  const roundIds = [...new Set(photos.map((photo) => photo.member_course_round_id))];

  let roundById = new Map<string, { played_on: string; member_user_id: string }>();
  if (roundIds.length > 0) {
    const { data: rounds } = await supabase
      .from("member_course_rounds")
      .select("id, played_on, member_user_id")
      .in("id", roundIds);

    roundById = new Map(
      (rounds ?? []).map((round) => [
        String(round.id),
        {
          played_on: String(round.played_on ?? ""),
          member_user_id: String(round.member_user_id ?? ""),
        },
      ]),
    );
  }

  const userIds = [
    ...new Set(
      [...roundById.values()]
        .map((round) => round.member_user_id)
        .filter(Boolean),
    ),
  ];

  let nameByUserId = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("member_profiles")
      .select("user_id, full_name")
      .in("user_id", userIds);

    nameByUserId = new Map(
      (profiles ?? [])
        .filter((profile) => profile.user_id)
        .map((profile) => [profile.user_id as string, profile.full_name as string]),
    );
  }

  const enriched = photos.map((photo) => {
    const round = roundById.get(photo.member_course_round_id);
    const memberUserId = round?.member_user_id;
    return {
      ...photo,
      played_on: round?.played_on,
      member_name: memberUserId ? nameByUserId.get(memberUserId) ?? "Member" : "Member",
    };
  });

  const withUrls = await attachSignedUrls(enriched);
  return { data: withUrls, error: null };
}

export async function fetchFeaturedCommunityPhotoUrl(golfCourseId: string) {
  if (!supabase) {
    return { url: null, error: new Error("Supabase is not configured.") };
  }

  const { data, error } = await supabase.rpc("get_featured_community_photo_path", {
    p_golf_course_id: golfCourseId,
  });

  if (!error) {
    const storagePath = typeof data === "string" ? data.trim() : "";
    if (storagePath) {
      return createSignedPhotoUrl(storagePath);
    }
  }

  // Pre-migration-060 fallback: when no is_featured photo exists, use the newest active image.
  // Never writes golf_courses.image_url — only signs member media for display.
  const primary = await supabase
    .from("member_course_round_photos")
    .select("storage_path, is_featured, created_at, mime_type")
    .eq("golf_course_id", golfCourseId)
    .eq("moderation_status", "active")
    .is("hidden_at", null)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(12);

  if (primary.error) {
    return { url: null, error: error ?? primary.error };
  }

  const imageRow = (primary.data ?? []).find((row) => {
    const mime = String(row.mime_type ?? "").toLowerCase();
    return !mime.startsWith("video/");
  });
  const path = String(imageRow?.storage_path ?? "").trim();
  if (!path) {
    return { url: null, error: null };
  }

  return createSignedPhotoUrl(path);
}

type UploadDraft = {
  file: File;
  caption: string;
  sortOrder: number;
};

async function uploadProcessedPhoto({
  userId,
  roundId,
  processed,
  caption,
  sortOrder,
}: {
  userId: string;
  roundId: string;
  processed: ProcessedCourseRoundImage;
  caption: string;
  sortOrder: number;
}) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const storagePath = buildStoragePath(userId, roundId, processed.extension);

  const { error: uploadError } = await supabase.storage
    .from(COURSE_ROUND_PHOTOS_BUCKET)
    .upload(storagePath, processed.blob, {
      contentType: processed.mimeType,
      upsert: false,
    });

  if (uploadError) {
    return { data: null, error: uploadError };
  }

  const insertPayload: Record<string, unknown> = {
    member_course_round_id: roundId,
    user_id: userId,
    storage_path: storagePath,
    caption: caption.trim() || null,
    sort_order: sortOrder,
    width: processed.width,
    height: processed.height,
    file_size_bytes: processed.fileSizeBytes,
    mime_type: processed.mimeType,
    media_kind: "image",
  };

  let row: Record<string, unknown> | null = null;
  let insertError: { message?: string } | null = null;

  {
    const inserted = await supabase
      .from("member_course_round_photos")
      .insert(insertPayload)
      .select(PHOTO_SELECT)
      .single();
    row = (inserted.data as Record<string, unknown> | null) ?? null;
    insertError = inserted.error;
  }

  if (insertError) {
    const message = (insertError.message ?? "").toLowerCase();
    // Retry without migration-060 columns when the live schema lacks them.
    if (
      message.includes("media_kind") ||
      message.includes("poster_storage_path") ||
      message.includes("duration_seconds") ||
      message.includes("schema cache") ||
      message.includes("does not exist")
    ) {
      delete insertPayload.media_kind;
      delete insertPayload.poster_storage_path;
      delete insertPayload.duration_seconds;
      const legacy = await supabase
        .from("member_course_round_photos")
        .insert(insertPayload)
        .select(PHOTO_SELECT_LEGACY)
        .single();
      row = (legacy.data as Record<string, unknown> | null) ?? null;
      insertError = legacy.error;
    }
  }

  if (insertError || !row) {
    console.error("[uploadProcessedPhoto] insert failed", insertError);
    await supabase.storage.from(COURSE_ROUND_PHOTOS_BUCKET).remove([storagePath]);
    return {
      data: null,
      error: insertError
        ? new Error(insertError.message || "Upload insert failed.")
        : new Error("Upload insert failed."),
    };
  }

  const photo = normalizePhoto(row);
  const { url } = await createSignedPhotoUrl(photo.storage_path);
  return { data: { ...photo, signed_url: url }, error: null };
}

async function uploadProcessedVideo({
  userId,
  roundId,
  processed,
  caption,
  sortOrder,
}: {
  userId: string;
  roundId: string;
  processed: ProcessedCourseRoundVideo;
  caption: string;
  sortOrder: number;
}) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const storagePath = buildStoragePath(userId, roundId, processed.extension);
  const pathsToCleanup: string[] = [storagePath];

  const { error: uploadError } = await supabase.storage
    .from(COURSE_ROUND_PHOTOS_BUCKET)
    .upload(storagePath, processed.blob, {
      contentType: processed.mimeType,
      upsert: false,
    });

  if (uploadError) {
    return { data: null, error: uploadError };
  }

  let posterStoragePath: string | null = null;
  if (processed.poster) {
    posterStoragePath = buildStoragePath(userId, roundId, processed.poster.extension);
    const { error: posterError } = await supabase.storage
      .from(COURSE_ROUND_PHOTOS_BUCKET)
      .upload(posterStoragePath, processed.poster.blob, {
        contentType: processed.poster.mimeType,
        upsert: false,
      });
    if (posterError) {
      await supabase.storage.from(COURSE_ROUND_PHOTOS_BUCKET).remove(pathsToCleanup);
      return { data: null, error: posterError };
    }
    pathsToCleanup.push(posterStoragePath);
  }

  const insertPayload: Record<string, unknown> = {
    member_course_round_id: roundId,
    user_id: userId,
    storage_path: storagePath,
    caption: caption.trim() || null,
    sort_order: sortOrder,
    width: processed.width ?? processed.poster?.width ?? null,
    height: processed.height ?? processed.poster?.height ?? null,
    file_size_bytes: processed.fileSizeBytes,
    mime_type: processed.mimeType,
    media_kind: "video",
    duration_seconds: processed.durationSeconds,
    poster_storage_path: posterStoragePath,
  };

  const { data, error: insertError } = await supabase
    .from("member_course_round_photos")
    .insert(insertPayload)
    .select(PHOTO_SELECT)
    .single();

  if (insertError) {
    await supabase.storage.from(COURSE_ROUND_PHOTOS_BUCKET).remove(pathsToCleanup);
    return { data: null, error: insertError };
  }

  const photo = normalizePhoto(data as Record<string, unknown>);
  const withUrls = await attachSignedUrls([photo]);
  return { data: withUrls[0] ?? photo, error: null };
}

export async function uploadCourseRoundPhotos(
  roundId: string,
  drafts: UploadDraft[],
): Promise<{ data: CourseRoundPhotoUploadResult | null; error: Error | null }> {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const { userId, error: sessionError } = await getCurrentAuthUserId();
  if (sessionError || !userId) {
    return {
      data: null,
      error: sessionError ?? new Error("You must be signed in to upload photos."),
    };
  }

  const uploaded: MemberCourseRoundPhotoRecord[] = [];
  const failed: Array<{ fileName: string; message: string }> = [];

  for (const draft of drafts) {
    try {
      const kind = detectRoundMediaKind(draft.file);
      if (kind === "video") {
        const processed = await processCourseRoundVideo(draft.file);
        const { data, error } = await uploadProcessedVideo({
          userId,
          roundId,
          processed,
          caption: draft.caption,
          sortOrder: draft.sortOrder,
        });
        if (error || !data) {
          failed.push({
            fileName: draft.file.name,
            message: error?.message ?? "Video upload failed.",
          });
          continue;
        }
        uploaded.push(data);
        continue;
      }

      const processed = await processCourseRoundImage(draft.file);
      const { data, error } = await uploadProcessedPhoto({
        userId,
        roundId,
        processed,
        caption: draft.caption,
        sortOrder: draft.sortOrder,
      });

      if (error || !data) {
        failed.push({
          fileName: draft.file.name,
          message: error?.message ?? "Upload failed.",
        });
        continue;
      }

      uploaded.push(data);
    } catch (processError) {
      failed.push({
        fileName: draft.file.name,
        message:
          processError instanceof Error ? processError.message : "Could not process media.",
      });
    }
  }

  return {
    data: { uploaded, failed },
    error: null,
  };
}

export async function deleteOwnCourseRoundPhoto(photo: MemberCourseRoundPhotoRecord) {
  if (!supabase) {
    return { error: new Error("Supabase is not configured.") };
  }

  const { userId, error: sessionError } = await getCurrentAuthUserId();
  if (sessionError || !userId) {
    return { error: sessionError ?? new Error("You must be signed in.") };
  }

  if (photo.user_id !== userId) {
    return { error: new Error("You can only delete your own photos.") };
  }

  const paths = [photo.storage_path];
  if (photo.poster_storage_path) {
    paths.push(photo.poster_storage_path);
  }

  const { error: storageError } = await supabase.storage
    .from(COURSE_ROUND_PHOTOS_BUCKET)
    .remove(paths);

  if (storageError) {
    return { error: storageError };
  }

  const { error: deleteError } = await supabase
    .from("member_course_round_photos")
    .delete()
    .eq("id", photo.id)
    .eq("user_id", userId);

  if (deleteError) {
    return { error: deleteError };
  }

  signedUrlCache.delete(photo.storage_path);
  if (photo.poster_storage_path) {
    signedUrlCache.delete(photo.poster_storage_path);
  }
  return { error: null };
}

export function signedUrlsToPhotoRecords(
  urls: string[],
  roundId = "",
): MemberCourseRoundPhotoRecord[] {
  return urls.map((url, index) => ({
    id: `${roundId || "feed"}-${index}`,
    member_course_round_id: roundId,
    user_id: "",
    storage_path: "",
    sort_order: index,
    is_featured: false,
    moderation_status: "active",
    created_at: "",
    signed_url: url,
  }));
}

export function groupPhotosByRoundId(
  photos: MemberCourseRoundPhotoRecord[],
  coverPhotoIdsByRoundId?: Map<string, string | null>,
) {
  const grouped = new Map<string, MemberCourseRoundPhotoRecord[]>();

  for (const photo of photos) {
    const existing = grouped.get(photo.member_course_round_id) ?? [];
    existing.push(photo);
    grouped.set(photo.member_course_round_id, existing);
  }

  for (const [roundId, roundPhotos] of grouped) {
    grouped.set(
      roundId,
      orderPhotosWithCoverFirst(roundPhotos, coverPhotoIdsByRoundId?.get(roundId)),
    );
  }

  return grouped;
}

export async function fetchCoverPhotoIdsForRoundIds(roundIds: string[]) {
  if (!supabase) {
    return {
      data: null as Map<string, string | null> | null,
      error: new Error("Supabase is not configured."),
    };
  }

  if (roundIds.length === 0) {
    return { data: new Map<string, string | null>(), error: null };
  }

  const { data, error } = await supabase
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
    (data ?? []).map((row) => [String(row.id), row.cover_photo_id ? String(row.cover_photo_id) : null]),
  );

  return { data: coverIdsByRoundId, error: null };
}

export async function setRoundCoverPhoto(roundId: string, photoId: string) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const normalizedRoundId = roundId.trim();
  const normalizedPhotoId = photoId.trim();

  if (!normalizedRoundId || !normalizedPhotoId) {
    return { data: null, error: new Error("Cover photo could not be updated.") };
  }

  const { data, error } = await supabase.rpc("set_member_course_round_cover_photo", {
    p_round_id: normalizedRoundId,
    p_photo_id: normalizedPhotoId,
  });

  if (error) {
    logSupabaseOperation("set_member_course_round_cover_photo", error, {
      roundId: normalizedRoundId,
      photoId: normalizedPhotoId,
    });
    return { data: null, error };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return { data: null, error: new Error("Cover photo could not be updated.") };
  }

  return {
    data: {
      roundId: String((row as { id?: string }).id ?? normalizedRoundId),
      coverPhotoId: String((row as { cover_photo_id?: string }).cover_photo_id ?? normalizedPhotoId),
    },
    error: null,
  };
}

export function buildRoundImageUrls(
  photos: MemberCourseRoundPhotoRecord[],
  coverPhotoId?: string | null,
) {
  return photoUrlsFromOrderedPhotos(orderPhotosWithCoverFirst(photos, coverPhotoId));
}

export function buildRoundMediaItems(
  photos: MemberCourseRoundPhotoRecord[],
  coverPhotoId?: string | null,
) {
  return mediaItemsFromPhotos(orderPhotosWithCoverFirst(photos, coverPhotoId));
}

export async function updateRoundPhotoSortOrders(
  updates: Array<{ id: string; sort_order: number }>,
) {
  if (!supabase) {
    return { error: new Error("Supabase is not configured.") };
  }

  const { userId, error: sessionError } = await getCurrentAuthUserId();
  if (sessionError || !userId) {
    return { error: sessionError ?? new Error("You must be signed in.") };
  }

  for (const update of updates) {
    const { error } = await supabase
      .from("member_course_round_photos")
      .update({ sort_order: update.sort_order })
      .eq("id", update.id)
      .eq("user_id", userId);

    if (error) {
      return { error };
    }
  }

  return { error: null };
}

export async function setCourseCommunityDisplayPhoto(golfCourseId: string, photoId: string) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const { data, error } = await supabase.rpc("set_course_community_display_photo", {
    p_golf_course_id: golfCourseId,
    p_photo_id: photoId,
  });

  if (error) {
    return { data: null, error };
  }

  return { data: data ? String(data) : photoId, error: null };
}

export async function golfCourseHasCuratedImage(golfCourseId: string) {
  if (!supabase) {
    return { data: false, error: new Error("Supabase is not configured.") };
  }

  const { data, error } = await supabase.rpc("golf_course_has_curated_image", {
    p_golf_course_id: golfCourseId,
  });

  if (error) {
    // Pre-migration fallback: treat non-empty admin-sourced image as curated via row read.
    const { data: course } = await supabase
      .from("golf_courses")
      .select("image_url, image_source")
      .eq("id", golfCourseId)
      .maybeSingle();
    if (!course) {
      return { data: false, error: null };
    }
    const hasUrl = Boolean(String(course.image_url ?? "").trim());
    const source = String(course.image_source ?? "").toLowerCase();
    return {
      data: hasUrl && (source === "admin" || source === "verified_rep"),
      error: null,
    };
  }

  return { data: Boolean(data), error: null };
}

let videoUploadSupportCache: boolean | null = null;

/** True when migration 060 media_kind column is available for video uploads. */
export async function isCourseRoundVideoUploadSupported() {
  if (videoUploadSupportCache !== null) {
    return videoUploadSupportCache;
  }
  if (!supabase) {
    videoUploadSupportCache = false;
    return false;
  }

  const { error } = await supabase
    .from("member_course_round_photos")
    .select("media_kind")
    .limit(1);

  if (!error) {
    videoUploadSupportCache = true;
    return true;
  }

  const message = (error.message ?? "").toLowerCase();
  videoUploadSupportCache = !(
    message.includes("media_kind") || message.includes("does not exist")
  );
  return videoUploadSupportCache;
}

export async function fetchGolfCourseIdsForRoundIds(roundIds: string[]) {
  const { data, error } = await fetchRoundFeedMetaForRoundIds(roundIds);
  if (error || !data) {
    return { data: null as Map<string, string | null> | null, error };
  }

  return {
    data: new Map([...data.entries()].map(([id, meta]) => [id, meta.golfCourseId])),
    error: null,
  };
}

export type RoundFeedMeta = {
  golfCourseId: string | null;
  location: string | null;
};

/** Round fields needed to render linked feed/experience cards without profile fallbacks. */
export async function fetchRoundFeedMetaForRoundIds(roundIds: string[]) {
  if (!supabase) {
    return {
      data: null as Map<string, RoundFeedMeta> | null,
      error: new Error("Supabase is not configured."),
    };
  }

  if (roundIds.length === 0) {
    return { data: new Map<string, RoundFeedMeta>(), error: null };
  }

  const { data, error } = await supabase
    .from("member_course_rounds")
    .select("id, golf_course_id, location")
    .in("id", roundIds);

  if (error) {
    return { data: null, error };
  }

  return {
    data: new Map(
      (data ?? []).map((row) => [
        String(row.id),
        {
          golfCourseId: row.golf_course_id ? String(row.golf_course_id) : null,
          location: row.location ? String(row.location).trim() || null : null,
        } satisfies RoundFeedMeta,
      ]),
    ),
    error: null,
  };
}
