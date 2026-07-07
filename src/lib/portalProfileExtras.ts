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
const LOCAL_PROFILE_KEY = "local-member";

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
  return `${STORAGE_PREFIX}${userId?.trim() || LOCAL_PROFILE_KEY}`;
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
  if (!value.trim()) return [];
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getPortalProfileExtras(userId: string | null | undefined): PortalProfileExtras {
  if (typeof window === "undefined") {
    return { ...defaultPortalProfileExtras };
  }

  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return { ...defaultPortalProfileExtras };

    const parsed = JSON.parse(raw) as Partial<PortalProfileExtras>;
    return normalizeExtras(parsed);
  } catch {
    return { ...defaultPortalProfileExtras };
  }
}

export function savePortalProfileExtras(
  userId: string | null | undefined,
  extras: PortalProfileExtras,
) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(storageKey(userId), JSON.stringify(extras));
}
