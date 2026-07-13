import {
  parseListInput,
  updateOwnMemberProfile,
  type MemberProfileSelfUpdate,
} from "./memberProfiles";
import type { MemberProfileRecord } from "../types/memberProfileRecord";

export type PortalProfileExtras = {
  cover_image_url: string;
  handicap: string;
  rounds_posted: string;
  countries_played: string;
  courses_played_count: string;
  full_name: string;
  headline: string;
  based_in: string;
  primary_club: string;
  bio: string;
  traveling_to: string;
  favorite_courses: string;
  profile_photo_url: string;
  has_local_snapshot?: boolean;
};

const STORAGE_PREFIX = "elitetee_portal_profile_extras:";
const LEGACY_BUCKET_KEY = "elitetee_bucket_list";
/** @deprecated Legacy shared key — cleared on invite signup to prevent profile bleed. */
export const LEGACY_SHARED_PROFILE_EXTRAS_KEY = `${STORAGE_PREFIX}local-member`;

export const defaultPortalProfileExtras: PortalProfileExtras = {
  cover_image_url: "",
  handicap: "",
  rounds_posted: "",
  countries_played: "",
  courses_played_count: "",
  full_name: "",
  headline: "",
  based_in: "",
  primary_club: "",
  bio: "",
  traveling_to: "",
  favorite_courses: "",
  profile_photo_url: "",
};

function storageKey(userId: string | null | undefined) {
  const normalized = userId?.trim();
  if (!normalized) return null;
  return `${STORAGE_PREFIX}${normalized}`;
}

export function clearLegacySharedProfileExtras() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LEGACY_SHARED_PROFILE_EXTRAS_KEY);
}

export function clearPortalProfileExtras(userId: string | null | undefined) {
  if (typeof window === "undefined") return;
  const key = storageKey(userId);
  if (key) {
    window.localStorage.removeItem(key);
  }
}

function normalizeExtras(parsed: Partial<PortalProfileExtras>): PortalProfileExtras {
  return {
    cover_image_url: parsed.cover_image_url ?? "",
    handicap: parsed.handicap ?? "",
    rounds_posted: parsed.rounds_posted ?? "",
    countries_played: parsed.countries_played ?? "",
    courses_played_count: parsed.courses_played_count ?? "",
    full_name: parsed.full_name ?? "",
    headline: parsed.headline ?? "",
    based_in: parsed.based_in ?? "",
    primary_club: parsed.primary_club ?? "",
    bio: parsed.bio ?? "",
    traveling_to: parsed.traveling_to ?? "",
    favorite_courses: parsed.favorite_courses ?? "",
    profile_photo_url: parsed.profile_photo_url ?? "",
    has_local_snapshot: Boolean(parsed.has_local_snapshot),
  };
}

export function parseFavoriteCoursesFromExtras(value: string): string[] {
  return parseListInput(value);
}

/** @deprecated Profile fields are persisted in Supabase. Reads legacy browser storage only. */
export function getPortalProfileExtras(userId: string | null | undefined): PortalProfileExtras {
  if (typeof window === "undefined") {
    return { ...defaultPortalProfileExtras };
  }

  const key = storageKey(userId);
  if (!key) {
    return { ...defaultPortalProfileExtras };
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return { ...defaultPortalProfileExtras };

    const parsed = JSON.parse(raw) as Partial<PortalProfileExtras>;
    return normalizeExtras(parsed);
  } catch {
    return { ...defaultPortalProfileExtras };
  }
}

/** @deprecated Profile fields are persisted in Supabase. */
export function savePortalProfileExtras(
  userId: string | null | undefined,
  extras: PortalProfileExtras,
) {
  if (typeof window === "undefined") return;

  const key = storageKey(userId);
  if (!key) return;

  window.localStorage.setItem(key, JSON.stringify(extras));
}

function readLegacyBucketListCourseIds(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(LEGACY_BUCKET_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function clearLegacyBucketListCourseIds() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LEGACY_BUCKET_KEY);
}

function buildLegacyExtrasMigration(
  profile: MemberProfileRecord,
  extras: PortalProfileExtras,
): MemberProfileSelfUpdate | null {
  const legacyBucketIds = readLegacyBucketListCourseIds();
  const shouldMigrateExtras = Boolean(extras.has_local_snapshot) || Boolean(extras.handicap.trim());
  const shouldMigrateBucket =
    legacyBucketIds.length > 0 && profile.bucket_list_course_ids.length === 0;

  if (!shouldMigrateExtras && !shouldMigrateBucket) {
    return null;
  }

  const useLocal = Boolean(extras.has_local_snapshot);

  return {
    full_name: useLocal && extras.full_name.trim() ? extras.full_name.trim() : profile.full_name,
    primary_club:
      useLocal && extras.primary_club.trim() ? extras.primary_club.trim() : profile.primary_club,
    based_in: useLocal && extras.based_in.trim() ? extras.based_in.trim() : profile.based_in,
    industry: useLocal && extras.headline.trim() ? extras.headline.trim() : profile.industry,
    traveling_to:
      useLocal && extras.traveling_to.trim() ? extras.traveling_to.trim() : profile.traveling_to,
    additional_clubs:
      useLocal && extras.favorite_courses.trim()
        ? parseFavoriteCoursesFromExtras(extras.favorite_courses)
        : profile.additional_clubs,
    regions: profile.regions,
    golf_interests: profile.golf_interests,
    business_interests: profile.business_interests,
    current_request: useLocal && extras.bio.trim() ? extras.bio.trim() : profile.current_request,
    handicap: extras.handicap.trim() || profile.handicap,
    bucket_list_course_ids: shouldMigrateBucket ? legacyBucketIds : profile.bucket_list_course_ids,
    club_logo_url: profile.club_logo_url ?? null,
    cover_photo_url: profile.cover_photo_url ?? null,
  };
}

export async function migrateLegacyPortalProfileExtrasIfNeeded(profile: MemberProfileRecord) {
  const userId = profile.user_id?.trim();
  if (!userId) {
    return { data: profile, migrated: false, error: null };
  }

  const extras = getPortalProfileExtras(userId);
  const migration = buildLegacyExtrasMigration(profile, extras);

  if (!migration) {
    return { data: profile, migrated: false, error: null };
  }

  const { data, error } = await updateOwnMemberProfile(migration);

  if (error) {
    if (import.meta.env.DEV) {
      console.error("[portalProfileExtras] legacy migration failed", error);
    }
    return { data: profile, migrated: false, error };
  }

  clearPortalProfileExtras(userId);
  clearLegacyBucketListCourseIds();

  return {
    data: data ?? { ...profile, ...migration },
    migrated: true,
    error: null,
  };
}
