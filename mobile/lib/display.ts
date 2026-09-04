const PLACEHOLDER_VALUES = new Set([
  "not specified",
  "n/a",
  "na",
  "none",
  "unknown",
  "—",
  "-",
]);

export function isMeaningfulDisplayValue(value: string | null | undefined): value is string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return false;
  return !PLACEHOLDER_VALUES.has(trimmed.toLowerCase());
}

export function formatPrimaryClubLine(primaryClub: string | null | undefined): string {
  const trimmed = primaryClub?.trim() ?? "";
  if (!isMeaningfulDisplayValue(trimmed)) return "";
  const firstClub = trimmed.split(/[,;\n]+/).map((club) => club.trim()).find(Boolean);
  return firstClub ?? "";
}

/** @deprecated Use formatPrimaryClubLine — never merges additional clubs into identity lines. */
export function formatMemberClubLine(
  primaryClub: string | null | undefined,
  _additionalClubs?: string[] | null,
): string {
  return formatPrimaryClubLine(primaryClub);
}

export function formatMemberContextLine(parts: Array<string | null | undefined>): string {
  return parts.filter(isMeaningfulDisplayValue).join(" · ");
}
