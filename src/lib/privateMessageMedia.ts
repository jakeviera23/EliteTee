import { getCurrentAuthUserId } from "./authUserLinking";
import { supabase } from "./supabase";

export const PRIVATE_MESSAGE_MEDIA_BUCKET = "private-message-media";
export const PRIVATE_MESSAGE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const PRIVATE_MESSAGE_IMAGE_MAX_COUNT = 3;
export const PRIVATE_MESSAGE_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type PrivateMessageImageMimeType = (typeof PRIVATE_MESSAGE_IMAGE_MIME_TYPES)[number];

export type PrivateMessageAttachmentRecord = {
  id: string;
  message_id: string;
  storage_path: string;
  content_type: string;
  byte_size: number;
  width: number | null;
  height: number | null;
  sort_order: number;
  created_at: string;
};

export type PrivateMessageAttachmentWithUrl = PrivateMessageAttachmentRecord & {
  signedUrl: string | null;
};

const SIGNED_URL_TTL_SECONDS = 3600;
const SIGNED_URL_REFRESH_BUFFER_MS = 5 * 60 * 1000;

type SignedUrlCacheEntry = {
  url: string;
  expiresAt: number;
};

const signedUrlCache = new Map<string, SignedUrlCacheEntry>();

const ATTACHMENT_SELECT =
  "id, message_id, storage_path, content_type, byte_size, width, height, sort_order, created_at";

function extensionForMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

export function isAllowedPrivateMessageImageMime(
  mime: string,
): mime is PrivateMessageImageMimeType {
  return (PRIVATE_MESSAGE_IMAGE_MIME_TYPES as readonly string[]).includes(mime);
}

export function validatePrivateMessageImageFile(file: File): string | null {
  if (!isAllowedPrivateMessageImageMime(file.type)) {
    return "Only JPEG, PNG, and WebP images are allowed.";
  }
  if (file.size <= 0) {
    return "This image file is empty.";
  }
  if (file.size > PRIVATE_MESSAGE_IMAGE_MAX_BYTES) {
    return "Each image must be 5 MB or smaller.";
  }
  return null;
}

export function validatePrivateMessageImageFiles(files: File[]): string | null {
  if (files.length === 0) return null;
  if (files.length > PRIVATE_MESSAGE_IMAGE_MAX_COUNT) {
    return "You can attach up to 3 images.";
  }
  for (const file of files) {
    const error = validatePrivateMessageImageFile(file);
    if (error) return error;
  }
  return null;
}

export async function readImageDimensions(
  file: File,
): Promise<{ width: number | null; height: number | null }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      const width = bitmap.width || null;
      const height = bitmap.height || null;
      bitmap.close();
      return { width, height };
    } catch {
      // fall through
    }
  }

  return await new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: image.naturalWidth || null,
        height: image.naturalHeight || null,
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: null, height: null });
    };
    image.src = url;
  });
}

export async function createSignedPrivateMessageMediaUrl(storagePath: string) {
  if (!supabase) {
    return { url: null, error: new Error("Supabase is not configured.") };
  }

  const normalizedPath = storagePath.trim();
  if (!normalizedPath) {
    return { url: null, error: null };
  }

  const cached = signedUrlCache.get(normalizedPath);
  if (cached && cached.expiresAt > Date.now() + SIGNED_URL_REFRESH_BUFFER_MS) {
    return { url: cached.url, error: null };
  }

  const { data, error } = await supabase.storage
    .from(PRIVATE_MESSAGE_MEDIA_BUCKET)
    .createSignedUrl(normalizedPath, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    signedUrlCache.delete(normalizedPath);
    return {
      url: null,
      error: error ?? new Error("Could not load this image."),
    };
  }

  signedUrlCache.set(normalizedPath, {
    url: data.signedUrl,
    expiresAt: Date.now() + SIGNED_URL_TTL_SECONDS * 1000,
  });

  return { url: data.signedUrl, error: null };
}

export async function fetchAttachmentsForMessageIds(messageIds: string[]) {
  if (!supabase) {
    return { data: [] as PrivateMessageAttachmentRecord[], error: new Error("Supabase is not configured.") };
  }

  const uniqueIds = [...new Set(messageIds.map((id) => id.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) {
    return { data: [] as PrivateMessageAttachmentRecord[], error: null };
  }

  const { data, error } = await supabase
    .from("private_message_attachments")
    .select(ATTACHMENT_SELECT)
    .in("message_id", uniqueIds)
    .order("sort_order", { ascending: true });

  return { data: (data ?? []) as PrivateMessageAttachmentRecord[], error };
}

export async function signPrivateMessageAttachments(
  attachments: PrivateMessageAttachmentRecord[],
): Promise<PrivateMessageAttachmentWithUrl[]> {
  return Promise.all(
    attachments.map(async (attachment) => {
      const { url } = await createSignedPrivateMessageMediaUrl(attachment.storage_path);
      return { ...attachment, signedUrl: url };
    }),
  );
}

export async function uploadPrivateMessageImages({
  messageId,
  files,
}: {
  messageId: string;
  files: File[];
}) {
  const { userId, error: sessionError } = await getCurrentAuthUserId();
  if (sessionError || !userId) {
    return {
      data: [] as PrivateMessageAttachmentRecord[],
      error: sessionError ?? new Error("You must be signed in."),
      uploadedPaths: [] as string[],
    };
  }

  if (!supabase) {
    return {
      data: [] as PrivateMessageAttachmentRecord[],
      error: new Error("Supabase is not configured."),
      uploadedPaths: [] as string[],
    };
  }

  const validationError = validatePrivateMessageImageFiles(files);
  if (validationError) {
    return {
      data: [] as PrivateMessageAttachmentRecord[],
      error: new Error(validationError),
      uploadedPaths: [] as string[],
    };
  }

  const uploadedPaths: string[] = [];
  const insertedRows: PrivateMessageAttachmentRecord[] = [];

  try {
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index]!;
      const ext = extensionForMime(file.type);
      const objectId = crypto.randomUUID();
      const storagePath = `${userId}/${messageId}/${objectId}.${ext}`;
      const { width, height } = await readImageDimensions(file);

      const { error: uploadError } = await supabase.storage
        .from(PRIVATE_MESSAGE_MEDIA_BUCKET)
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }
      uploadedPaths.push(storagePath);

      const { data: row, error: insertError } = await supabase
        .from("private_message_attachments")
        .insert({
          message_id: messageId,
          storage_path: storagePath,
          content_type: file.type,
          byte_size: file.size,
          width,
          height,
          sort_order: index,
        })
        .select(ATTACHMENT_SELECT)
        .maybeSingle();

      if (insertError || !row) {
        throw insertError ?? new Error("Attachment metadata could not be saved.");
      }

      insertedRows.push(row as PrivateMessageAttachmentRecord);
    }

    return { data: insertedRows, error: null, uploadedPaths };
  } catch (error) {
    if (uploadedPaths.length > 0) {
      await supabase.storage.from(PRIVATE_MESSAGE_MEDIA_BUCKET).remove(uploadedPaths);
    }
    if (insertedRows.length > 0) {
      await supabase
        .from("private_message_attachments")
        .delete()
        .in(
          "id",
          insertedRows.map((row) => row.id),
        );
    }
    return {
      data: [] as PrivateMessageAttachmentRecord[],
      error: error instanceof Error ? error : new Error("Image upload failed."),
      uploadedPaths: [],
    };
  }
}

export async function deletePrivateMessageMediaPaths(paths: string[]) {
  if (!supabase || paths.length === 0) return;
  await supabase.storage.from(PRIVATE_MESSAGE_MEDIA_BUCKET).remove(paths);
}

export function formatMessagePreviewBody(
  body: string,
  attachmentCount = 0,
): string {
  const trimmed = body.trim();
  if (trimmed) return trimmed;
  if (attachmentCount <= 0) return "";
  return attachmentCount === 1 ? "Photo" : "Photos";
}
