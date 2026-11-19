import { getCurrentUserId } from "./members";
import { requireSupabase } from "../supabase";
import {
  getCachedSignedUrl,
  setCachedSignedUrl,
} from "../signedUrlCache";

export const MEMBER_PROFILE_MEDIA_BUCKET = "member-profile-media";
export const MAX_PROFILE_MEDIA_BYTES = 12 * 1024 * 1024;
const SIGNED_URL_TTL_SECONDS = 3600;

export async function resolveMemberMediaUrl(stored: string | null | undefined) {
  const trimmed = stored?.trim() ?? "";
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const cached = getCachedSignedUrl(MEMBER_PROFILE_MEDIA_BUCKET, trimmed);
  if (cached) return cached;

  const client = requireSupabase();
  const { data, error } = await client.storage
    .from(MEMBER_PROFILE_MEDIA_BUCKET)
    .createSignedUrl(trimmed, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) return null;
  setCachedSignedUrl(MEMBER_PROFILE_MEDIA_BUCKET, trimmed, data.signedUrl);
  return data.signedUrl;
}

export async function resolveMemberMediaUrlMap(storedPaths: Array<string | null | undefined>) {
  const uniquePaths = [
    ...new Set(
      storedPaths
        .map((path) => path?.trim() ?? "")
        .filter((path) => path && !/^https?:\/\//i.test(path)),
    ),
  ];

  const entries = await Promise.all(
    uniquePaths.map(async (path) => [path, await resolveMemberMediaUrl(path)] as const),
  );

  return new Map(entries);
}

export async function resolveMemberProfileMedia(profile: {
  cover_photo_url: string | null;
  club_logo_url: string | null;
}) {
  const [coverImageUrl, avatarImageUrl] = await Promise.all([
    resolveMemberMediaUrl(profile.cover_photo_url),
    resolveMemberMediaUrl(profile.club_logo_url),
  ]);

  return { coverImageUrl, avatarImageUrl };
}

function randomUuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function extensionFromMime(mimeType: string) {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  return "jpg";
}

function isStoredMediaPath(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return false;
  return !/^https?:\/\//i.test(trimmed);
}

async function uploadProfileMediaBlob({
  uri,
  mimeType,
  kind,
}: {
  uri: string;
  mimeType: string;
  kind: "avatar" | "cover";
}): Promise<{ path: string | null; error: Error | null }> {
  const { userId, error: sessionError } = await getCurrentUserId();
  if (sessionError || !userId) {
    return {
      path: null,
      error: sessionError ?? new Error("You must be signed in to upload a photo."),
    };
  }

  try {
    const response = await fetch(uri);
    const blob = await response.blob();

    if (blob.size > MAX_PROFILE_MEDIA_BYTES) {
      return {
        path: null,
        error: new Error("Image must be 12 MB or smaller."),
      };
    }

    const extension = extensionFromMime(mimeType || blob.type || "image/jpeg");
    const storagePath =
      kind === "cover"
        ? `${userId}/cover/${randomUuid()}.${extension}`
        : `${userId}/avatar/${randomUuid()}.${extension}`;

    const client = requireSupabase();
    const { error: uploadError } = await client.storage
      .from(MEMBER_PROFILE_MEDIA_BUCKET)
      .upload(storagePath, blob, {
        contentType: mimeType || blob.type || "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      return { path: null, error: uploadError };
    }

    return { path: storagePath, error: null };
  } catch (error) {
    return {
      path: null,
      error: error instanceof Error ? error : new Error("Photo upload failed."),
    };
  }
}

export async function uploadMemberAvatarPhoto(uri: string, mimeType = "image/jpeg") {
  return uploadProfileMediaBlob({ uri, mimeType, kind: "avatar" });
}

export async function uploadMemberCoverPhoto(uri: string, mimeType = "image/jpeg") {
  return uploadProfileMediaBlob({ uri, mimeType, kind: "cover" });
}

/** Best-effort cleanup of replaced storage objects. Failures are non-blocking. */
export async function deleteMemberMediaPath(path: string | null | undefined) {
  const normalizedPath = path?.trim() ?? "";
  if (!normalizedPath || !isStoredMediaPath(normalizedPath)) {
    return { error: null };
  }

  const client = requireSupabase();
  const { error } = await client.storage.from(MEMBER_PROFILE_MEDIA_BUCKET).remove([normalizedPath]);
  return { error };
}
