import { getCurrentUserId } from "./members";
import { requireSupabase } from "../supabase";
import {
  extensionForPrivateMessageImageMime,
  isAllowedPrivateMessageImageMime,
  normalizePrivateMessageImageMime,
  validatePrivateMessageImageDraft,
  validatePrivateMessageImageDrafts,
  type MobilePrivateMessageImageDraft,
} from "../privateMessageImageRules";
import type { MobilePrivateMessageAttachment } from "@/types/messages";

export {
  normalizePrivateMessageImageMime,
  PRIVATE_MESSAGE_IMAGE_MAX_BYTES,
  PRIVATE_MESSAGE_IMAGE_MAX_COUNT,
  PRIVATE_MESSAGE_IMAGE_MIME_TYPES,
  validatePrivateMessageImageDraft,
  validatePrivateMessageImageDrafts,
  type MobilePrivateMessageImageDraft,
  type PrivateMessageImageMimeType,
} from "../privateMessageImageRules";

export const PRIVATE_MESSAGE_MEDIA_BUCKET = "private-message-media";

const ATTACHMENT_SELECT =
  "id, message_id, storage_path, content_type, byte_size, width, height, sort_order, created_at";

function randomUuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export async function uploadPrivateMessageImages({
  messageId,
  drafts,
}: {
  messageId: string;
  drafts: MobilePrivateMessageImageDraft[];
}): Promise<{
  data: MobilePrivateMessageAttachment[];
  error: Error | null;
  uploadedPaths: string[];
}> {
  const { userId, error: sessionError } = await getCurrentUserId();
  if (sessionError || !userId) {
    return {
      data: [],
      error: sessionError ?? new Error("You must be signed in."),
      uploadedPaths: [],
    };
  }

  const validationError = validatePrivateMessageImageDrafts(drafts);
  if (validationError) {
    return { data: [], error: new Error(validationError), uploadedPaths: [] };
  }

  const client = requireSupabase();
  const uploadedPaths: string[] = [];
  const insertedRows: MobilePrivateMessageAttachment[] = [];

  try {
    for (let index = 0; index < drafts.length; index += 1) {
      const draft = drafts[index]!;
      const mime = normalizePrivateMessageImageMime(draft.mimeType, draft.fileName);
      const response = await fetch(draft.uri);
      const blob = await response.blob();
      const sizeError = validatePrivateMessageImageDraft(draft, blob.size);
      if (sizeError) {
        throw new Error(sizeError);
      }

      const contentType = isAllowedPrivateMessageImageMime(blob.type)
        ? blob.type
        : mime;
      if (!isAllowedPrivateMessageImageMime(contentType)) {
        throw new Error("Only JPEG, PNG, and WebP images are allowed.");
      }

      const ext = extensionForPrivateMessageImageMime(contentType);
      const storagePath = `${userId}/${messageId}/${randomUuid()}.${ext}`;

      const { error: uploadError } = await client.storage
        .from(PRIVATE_MESSAGE_MEDIA_BUCKET)
        .upload(storagePath, blob, {
          contentType,
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }
      uploadedPaths.push(storagePath);

      const { data: row, error: insertError } = await client
        .from("private_message_attachments")
        .insert({
          message_id: messageId,
          storage_path: storagePath,
          content_type: contentType,
          byte_size: blob.size,
          width: draft.width ?? null,
          height: draft.height ?? null,
          sort_order: index,
        })
        .select(ATTACHMENT_SELECT)
        .maybeSingle();

      if (insertError || !row) {
        throw insertError ?? new Error("Attachment metadata could not be saved.");
      }

      insertedRows.push(row as MobilePrivateMessageAttachment);
    }

    return { data: insertedRows, error: null, uploadedPaths };
  } catch (error) {
    if (uploadedPaths.length > 0) {
      await client.storage.from(PRIVATE_MESSAGE_MEDIA_BUCKET).remove(uploadedPaths);
    }
    if (insertedRows.length > 0) {
      await client
        .from("private_message_attachments")
        .delete()
        .in(
          "id",
          insertedRows.map((row) => row.id),
        );
    }
    return {
      data: [],
      error: error instanceof Error ? error : new Error("Image upload failed."),
      uploadedPaths: [],
    };
  }
}
