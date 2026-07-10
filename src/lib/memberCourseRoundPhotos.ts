import type {
  CourseRoundPhotoUploadResult,
  MemberCourseRoundPhotoRecord,
} from "../types/memberCourseRoundPhoto";
import type { ProcessedCourseRoundImage } from "./courseRoundImageProcessing";
import { processCourseRoundImage } from "./courseRoundImageProcessing";
import { getCurrentAuthUserId } from "./authUserLinking";
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
  "id, member_course_round_id, user_id, golf_course_id, storage_path, caption, sort_order, width, height, file_size_bytes, mime_type, is_featured, moderation_status, hidden_at, hidden_reason, created_at";

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
    is_featured: Boolean(row.is_featured),
    moderation_status: String(row.moderation_status ?? "active"),
    hidden_at: row.hidden_at ? String(row.hidden_at) : null,
    hidden_reason: row.hidden_reason ? String(row.hidden_reason) : null,
    created_at: String(row.created_at ?? ""),
  };
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
      return { ...photo, signed_url: url };
    }),
  );

  return withUrls;
}

export async function fetchPhotosForRoundIds(roundIds: string[]) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  if (roundIds.length === 0) {
    return { data: [] as MemberCourseRoundPhotoRecord[], error: null };
  }

  const { data, error } = await supabase
    .from("member_course_round_photos")
    .select(PHOTO_SELECT)
    .in("member_course_round_id", roundIds)
    .eq("moderation_status", "active")
    .is("hidden_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return { data: null, error };
  }

  const photos = (data ?? []).map((row) => normalizePhoto(row as Record<string, unknown>));
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

  if (error) {
    return { url: null, error };
  }

  const storagePath = typeof data === "string" ? data.trim() : "";
  if (!storagePath) {
    return { url: null, error: null };
  }

  return createSignedPhotoUrl(storagePath);
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

  const { data, error: insertError } = await supabase
    .from("member_course_round_photos")
    .insert({
      member_course_round_id: roundId,
      user_id: userId,
      storage_path: storagePath,
      caption: caption.trim() || null,
      sort_order: sortOrder,
      width: processed.width,
      height: processed.height,
      file_size_bytes: processed.fileSizeBytes,
      mime_type: processed.mimeType,
    })
    .select(PHOTO_SELECT)
    .single();

  if (insertError) {
    await supabase.storage.from(COURSE_ROUND_PHOTOS_BUCKET).remove([storagePath]);
    return { data: null, error: insertError };
  }

  const photo = normalizePhoto(data as Record<string, unknown>);
  const { url } = await createSignedPhotoUrl(photo.storage_path);
  return { data: { ...photo, signed_url: url }, error: null };
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
        message: processError instanceof Error ? processError.message : "Could not process image.",
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

  const { error: storageError } = await supabase.storage
    .from(COURSE_ROUND_PHOTOS_BUCKET)
    .remove([photo.storage_path]);

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

export function groupPhotosByRoundId(photos: MemberCourseRoundPhotoRecord[]) {
  const grouped = new Map<string, MemberCourseRoundPhotoRecord[]>();

  for (const photo of photos) {
    const existing = grouped.get(photo.member_course_round_id) ?? [];
    existing.push(photo);
    grouped.set(photo.member_course_round_id, existing);
  }

  for (const [roundId, roundPhotos] of grouped) {
    grouped.set(
      roundId,
      [...roundPhotos].sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at)),
    );
  }

  return grouped;
}
