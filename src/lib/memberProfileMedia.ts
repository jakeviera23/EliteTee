import type { MemberProfileRecord } from "../types/memberProfileRecord";
import { processCourseRoundImage } from "./courseRoundImageProcessing";
import { getCurrentAuthUserId } from "./authUserLinking";
import { supabase } from "./supabase";

export const MEMBER_PROFILE_MEDIA_BUCKET = "member-profile-media";
const SIGNED_URL_TTL_SECONDS = 3600;
const SIGNED_URL_REFRESH_BUFFER_MS = 5 * 60 * 1000;
const COVER_LONG_EDGE_PX = 2400;
const AVATAR_LONG_EDGE_PX = 960;

type SignedUrlCacheEntry = {
  url: string;
  expiresAt: number;
};

const signedUrlCache = new Map<string, SignedUrlCacheEntry>();

export function isStoredMediaPath(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return false;
  if (/^https?:\/\//i.test(trimmed)) return false;
  return true;
}

export async function createSignedMemberMediaUrl(storagePath: string) {
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
    .from(MEMBER_PROFILE_MEDIA_BUCKET)
    .createSignedUrl(normalizedPath, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    signedUrlCache.delete(normalizedPath);
    return {
      url: null,
      error: error ?? new Error("Could not load this image. It may have been removed."),
    };
  }

  signedUrlCache.set(normalizedPath, {
    url: data.signedUrl,
    expiresAt: Date.now() + SIGNED_URL_TTL_SECONDS * 1000,
  });

  return { url: data.signedUrl, error: null };
}

export async function resolveMemberMediaUrl(stored: string | null | undefined) {
  const trimmed = stored?.trim() ?? "";
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const { url } = await createSignedMemberMediaUrl(trimmed);
  return url;
}

export async function resolveMemberProfileMedia(
  profile: Pick<MemberProfileRecord, "cover_photo_url" | "club_logo_url"> | null,
) {
  if (!profile) {
    return { coverImageUrl: null, avatarImageUrl: null };
  }

  const [coverImageUrl, avatarImageUrl] = await Promise.all([
    resolveMemberMediaUrl(profile.cover_photo_url),
    resolveMemberMediaUrl(profile.club_logo_url),
  ]);

  return { coverImageUrl, avatarImageUrl };
}

function buildCoverStoragePath(userId: string, extension: string) {
  return `${userId}/cover/${crypto.randomUUID()}.${extension}`;
}

function buildAvatarStoragePath(userId: string, extension: string) {
  return `${userId}/avatar/${crypto.randomUUID()}.${extension}`;
}

async function uploadProcessedProfileMedia({
  processed,
  storagePath,
}: {
  processed: Awaited<ReturnType<typeof processCourseRoundImage>>;
  storagePath: string;
}) {
  if (!supabase) {
    return { path: null, error: new Error("Supabase is not configured.") };
  }

  const { error: uploadError } = await supabase.storage
    .from(MEMBER_PROFILE_MEDIA_BUCKET)
    .upload(storagePath, processed.blob, {
      contentType: processed.mimeType,
      upsert: false,
    });

  if (uploadError) {
    return { path: null, error: uploadError };
  }

  return { path: storagePath, error: null };
}

export async function uploadMemberCoverPhoto(file: File) {
  const { userId, error: sessionError } = await getCurrentAuthUserId();
  if (sessionError || !userId) {
    return {
      path: null,
      error: sessionError ?? new Error("You must be signed in to upload a cover photo."),
    };
  }

  try {
    const processed = await processCourseRoundImage(file, COVER_LONG_EDGE_PX);
    const storagePath = buildCoverStoragePath(userId, processed.extension);
    return uploadProcessedProfileMedia({ processed, storagePath });
  } catch (error) {
    return {
      path: null,
      error: error instanceof Error ? error : new Error("Cover photo upload failed."),
    };
  }
}

export async function uploadMemberAvatarPhoto(file: File) {
  const { userId, error: sessionError } = await getCurrentAuthUserId();
  if (sessionError || !userId) {
    return {
      path: null,
      error: sessionError ?? new Error("You must be signed in to upload a profile photo."),
    };
  }

  try {
    const processed = await processCourseRoundImage(file, AVATAR_LONG_EDGE_PX);
    const storagePath = buildAvatarStoragePath(userId, processed.extension);
    return uploadProcessedProfileMedia({ processed, storagePath });
  } catch (error) {
    return {
      path: null,
      error: error instanceof Error ? error : new Error("Profile photo upload failed."),
    };
  }
}

export async function deleteMemberMediaPath(path: string | null | undefined) {
  if (!supabase) {
    return { error: new Error("Supabase is not configured.") };
  }

  const normalizedPath = path?.trim() ?? "";
  if (!normalizedPath || !isStoredMediaPath(normalizedPath)) {
    return { error: null };
  }

  const { error } = await supabase.storage.from(MEMBER_PROFILE_MEDIA_BUCKET).remove([normalizedPath]);
  if (!error) {
    signedUrlCache.delete(normalizedPath);
  }

  return { error };
}

export function invalidateMemberMediaCache(path: string | null | undefined) {
  const normalizedPath = path?.trim() ?? "";
  if (normalizedPath) {
    signedUrlCache.delete(normalizedPath);
  }
}
