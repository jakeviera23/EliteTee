import type {
  FeedPostMediaDraft,
  FeedPostMediaRecord,
  FeedPostMediaUploadResult,
} from "../types/feedPostMedia";
import { getCurrentAuthUserId } from "./authUserLinking";
import { processCourseRoundImage } from "./courseRoundImageProcessing";
import { supabase } from "./supabase";

export const FEED_POST_MEDIA_BUCKET = "feed-post-media";
const SIGNED_URL_TTL_SECONDS = 3600;
const SIGNED_URL_REFRESH_BUFFER_MS = 5 * 60 * 1000;

const MEDIA_SELECT =
  "id, feed_post_id, user_id, storage_path, caption, sort_order, width, height, file_size_bytes, mime_type, moderation_status, hidden_at, hidden_reason, created_at";

type SignedUrlCacheEntry = { url: string; expiresAt: number };
const signedUrlCache = new Map<string, SignedUrlCacheEntry>();

function normalizeFeedPostMedia(row: Record<string, unknown>): FeedPostMediaRecord {
  return {
    id: String(row.id ?? ""),
    feed_post_id: String(row.feed_post_id ?? ""),
    user_id: String(row.user_id ?? ""),
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
    moderation_status: String(row.moderation_status ?? "active"),
    hidden_at: row.hidden_at ? String(row.hidden_at) : null,
    hidden_reason: row.hidden_reason ? String(row.hidden_reason) : null,
    created_at: String(row.created_at ?? ""),
  };
}

function buildStoragePath(userId: string, postId: string, extension: string) {
  return `${userId}/${postId}/${crypto.randomUUID()}.${extension}`;
}

export function orderFeedPostMediaDrafts<T extends { id: string }>(
  drafts: T[],
  coverDraftId: string | null,
): T[] {
  if (!coverDraftId) return [...drafts];
  const cover = drafts.find((draft) => draft.id === coverDraftId);
  if (!cover) return [...drafts];
  return [cover, ...drafts.filter((draft) => draft.id !== coverDraftId)];
}

async function createSignedMediaUrl(storagePath: string) {
  if (!supabase) return null;

  const cached = signedUrlCache.get(storagePath);
  if (cached && cached.expiresAt > Date.now() + SIGNED_URL_REFRESH_BUFFER_MS) {
    return cached.url;
  }

  const { data, error } = await supabase.storage
    .from(FEED_POST_MEDIA_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    signedUrlCache.delete(storagePath);
    return null;
  }

  signedUrlCache.set(storagePath, {
    url: data.signedUrl,
    expiresAt: Date.now() + SIGNED_URL_TTL_SECONDS * 1000,
  });
  return data.signedUrl;
}

export async function fetchFeedPostMediaForPostIds(postIds: string[]) {
  if (!supabase) {
    return { data: [] as FeedPostMediaRecord[], error: new Error("Supabase is not configured.") };
  }
  if (postIds.length === 0) {
    return { data: [] as FeedPostMediaRecord[], error: null };
  }

  const { data, error } = await supabase
    .from("feed_post_media")
    .select(MEDIA_SELECT)
    .in("feed_post_id", postIds)
    .eq("moderation_status", "active")
    .is("hidden_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return { data: [] as FeedPostMediaRecord[], error };

  const records = (data ?? []).map((row) =>
    normalizeFeedPostMedia(row as Record<string, unknown>),
  );
  const withUrls = await Promise.all(
    records.map(async (record) => ({
      ...record,
      signed_url: await createSignedMediaUrl(record.storage_path),
    })),
  );
  return { data: withUrls, error: null };
}

export async function uploadFeedPostMedia(
  postId: string,
  drafts: FeedPostMediaDraft[],
  coverDraftId: string | null,
): Promise<{ data: FeedPostMediaUploadResult | null; error: Error | null }> {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const { userId, error: sessionError } = await getCurrentAuthUserId();
  if (sessionError || !userId) {
    return {
      data: null,
      error: sessionError ?? new Error("You must be signed in to upload photographs."),
    };
  }

  const orderedDrafts = orderFeedPostMediaDrafts(drafts, coverDraftId);
  const uploaded: FeedPostMediaRecord[] = [];
  const failed: Array<{ fileName: string; message: string }> = [];

  for (const [sortOrder, draft] of orderedDrafts.entries()) {
    let storagePath: string | null = null;
    try {
      const processed = await processCourseRoundImage(draft.file);
      storagePath = buildStoragePath(userId, postId, processed.extension);
      const { error: uploadError } = await supabase.storage
        .from(FEED_POST_MEDIA_BUCKET)
        .upload(storagePath, processed.blob, {
          contentType: processed.mimeType,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data, error: insertError } = await supabase
        .from("feed_post_media")
        .insert({
          feed_post_id: postId,
          user_id: userId,
          storage_path: storagePath,
          caption: draft.caption.trim() || null,
          sort_order: sortOrder,
          width: processed.width,
          height: processed.height,
          file_size_bytes: processed.fileSizeBytes,
          mime_type: processed.mimeType,
        })
        .select(MEDIA_SELECT)
        .single();

      if (insertError || !data) {
        await supabase.storage.from(FEED_POST_MEDIA_BUCKET).remove([storagePath]);
        storagePath = null;
        throw insertError ?? new Error("Photo metadata could not be saved.");
      }

      const record = normalizeFeedPostMedia(data as Record<string, unknown>);
      uploaded.push({
        ...record,
        signed_url: await createSignedMediaUrl(record.storage_path),
      });
    } catch (error) {
      if (storagePath) {
        await supabase.storage.from(FEED_POST_MEDIA_BUCKET).remove([storagePath]);
      }
      failed.push({
        fileName: draft.file.name,
        message: error instanceof Error ? error.message : "Upload failed.",
      });
    }
  }

  return { data: { uploaded, failed }, error: null };
}
