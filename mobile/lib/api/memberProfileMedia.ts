import { requireSupabase } from "../supabase";
import {
  getCachedSignedUrl,
  setCachedSignedUrl,
} from "../signedUrlCache";

export const MEMBER_PROFILE_MEDIA_BUCKET = "member-profile-media";
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
