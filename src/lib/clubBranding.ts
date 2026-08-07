export const CLUB_BRAND_RIGHTS_STATUSES = [
  "unverified",
  "permission_granted",
  "first_party",
  "public_domain",
  "rejected",
  "expired",
] as const;

export type ClubBrandRightsStatus = (typeof CLUB_BRAND_RIGHTS_STATUSES)[number];

const DISPLAYABLE_RIGHTS = new Set<ClubBrandRightsStatus>([
  "permission_granted",
  "first_party",
  "public_domain",
]);

export function canDisplayClubBrandAsset(
  assetUrl: string | null | undefined,
  rightsStatus: ClubBrandRightsStatus | null | undefined,
) {
  return Boolean(assetUrl?.trim() && rightsStatus && DISPLAYABLE_RIGHTS.has(rightsStatus));
}

export function getClubMarkInitials(name: string) {
  const ignoredWords = new Set(["and", "at", "club", "course", "golf", "of", "the"]);
  const words = name
    .split(/\s+/)
    .map((word) => word.replace(/[^a-zA-Z0-9]/g, ""))
    .filter((word) => word && !ignoredWords.has(word.toLowerCase()));

  if (words.length === 0) return "ET";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
}

export function getClubMarkTone(name: string) {
  let hash = 0;
  for (const character of name.trim().toLowerCase()) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return hash % 4;
}
