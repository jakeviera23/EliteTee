export type PortalProfileExtras = {
  cover_image_url: string;
  handicap: string;
  rounds_posted: string;
  countries_played: string;
  courses_played_count: string;
};

const STORAGE_PREFIX = "elitetee_portal_profile_extras:";

export const defaultPortalProfileExtras: PortalProfileExtras = {
  cover_image_url: "",
  handicap: "",
  rounds_posted: "",
  countries_played: "",
  courses_played_count: "",
};

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

export function getPortalProfileExtras(userId: string | null | undefined): PortalProfileExtras {
  if (!userId || typeof window === "undefined") {
    return { ...defaultPortalProfileExtras };
  }

  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return { ...defaultPortalProfileExtras };

    const parsed = JSON.parse(raw) as Partial<PortalProfileExtras>;
    return {
      cover_image_url: parsed.cover_image_url ?? "",
      handicap: parsed.handicap ?? "",
      rounds_posted: parsed.rounds_posted ?? "",
      countries_played: parsed.countries_played ?? "",
      courses_played_count: parsed.courses_played_count ?? "",
    };
  } catch {
    return { ...defaultPortalProfileExtras };
  }
}

export function savePortalProfileExtras(
  userId: string | null | undefined,
  extras: PortalProfileExtras,
) {
  if (!userId || typeof window === "undefined") return;

  window.localStorage.setItem(storageKey(userId), JSON.stringify(extras));
}
