export const US_STATE_CANONICAL: Record<string, string> = {
  NY: "New York",
  "NEW YORK": "New York",
  NJ: "New Jersey",
  "NEW JERSEY": "New Jersey",
  FL: "Florida",
  FLORIDA: "Florida",
  CA: "California",
  CALIFORNIA: "California",
  SC: "South Carolina",
  "SOUTH CAROLINA": "South Carolina",
  NC: "North Carolina",
  "NORTH CAROLINA": "North Carolina",
  MA: "Massachusetts",
  MASSACHUSETTS: "Massachusetts",
  OH: "Ohio",
  OHIO: "Ohio",
  IL: "Illinois",
  ILLINOIS: "Illinois",
  PA: "Pennsylvania",
  PENNSYLVANIA: "Pennsylvania",
  GA: "Georgia",
  GEORGIA: "Georgia",
  TX: "Texas",
  TEXAS: "Texas",
  OR: "Oregon",
  OREGON: "Oregon",
  WI: "Wisconsin",
  WISCONSIN: "Wisconsin",
  AZ: "Arizona",
  ARIZONA: "Arizona",
  VA: "Virginia",
  VIRGINIA: "Virginia",
  MD: "Maryland",
  MARYLAND: "Maryland",
  CT: "Connecticut",
  CONNECTICUT: "Connecticut",
  MI: "Michigan",
  MICHIGAN: "Michigan",
  IN: "Indiana",
  INDIANA: "Indiana",
  TN: "Tennessee",
  TENNESSEE: "Tennessee",
};

const US_STATE_SEARCH_TOKEN = Object.entries(US_STATE_CANONICAL).reduce<Record<string, string>>(
  (lookup, [rawKey, canonicalName]) => {
    if (rawKey.length === 2) {
      lookup[canonicalName] = rawKey;
    }
    return lookup;
  },
  {},
);

function isUnitedStatesCountry(country: string | null | undefined): boolean {
  const normalized = country?.trim().toLowerCase() ?? "";
  return normalized === "united states" || normalized === "usa" || normalized === "us";
}

export function getUsStateSearchToken(
  country: string | null | undefined,
  canonicalRegion: string,
): string | null {
  if (!isUnitedStatesCountry(country)) return null;
  return US_STATE_SEARCH_TOKEN[canonicalRegion] ?? null;
}

export function normalizeRegionLabel(country: string | null | undefined, region: string | null | undefined) {
  const trimmed = region?.trim();
  if (!trimmed) return "";

  const normalizedCountry = country?.trim().toLowerCase() ?? "";
  if (normalizedCountry === "united states" || normalizedCountry === "usa" || normalizedCountry === "us") {
    const key = trimmed.toUpperCase();
    return US_STATE_CANONICAL[key] ?? trimmed;
  }

  return trimmed;
}

