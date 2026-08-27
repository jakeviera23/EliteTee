import { normalizeCourseLocationQuery } from "./course-location.ts";

/**
 * Conservative member-location LIKE terms.
 * Expands abbreviations to full names; adds only distinctive short aliases (e.g. nyc)
 * and padded 2-letter forms (e.g. " fl", "fl ") so profiles like "FL and NY" match
 * without bare `%fl%` / `%ny%` substring matching.
 */
const MEMBER_LOCATION_ALIASES: Record<string, string[]> = {
  "new york": ["new york", "nyc"],
  ny: ["new york", "nyc"],
  nyc: ["new york", "nyc"],
  florida: ["florida"],
  fl: ["florida"],
  california: ["california"],
  ca: ["california"],
  texas: ["texas"],
  tx: ["texas"],
  "new jersey": ["new jersey"],
  nj: ["new jersey"],
  massachusetts: ["massachusetts"],
  ma: ["massachusetts"],
  connecticut: ["connecticut"],
  ct: ["connecticut"],
  pennsylvania: ["pennsylvania"],
  pa: ["pennsylvania"],
  illinois: ["illinois"],
  il: ["illinois"],
  georgia: ["georgia"],
  ga: ["georgia"],
  "north carolina": ["north carolina"],
  nc: ["north carolina"],
  "south carolina": ["south carolina"],
  sc: ["south carolina"],
  arizona: ["arizona"],
  az: ["arizona"],
  colorado: ["colorado"],
  co: ["colorado"],
  nevada: ["nevada"],
  nv: ["nevada"],
  washington: ["washington"],
  wa: ["washington"],
  miami: ["miami"],
  "los angeles": ["los angeles"],
  la: ["los angeles"],
};

/** Canonical place → 2-letter abbreviation for padded LIKE terms only. */
const CANONICAL_ABBREVIATIONS: Record<string, string> = {
  florida: "fl",
  "new york": "ny",
  california: "ca",
  texas: "tx",
  "new jersey": "nj",
  massachusetts: "ma",
  connecticut: "ct",
  pennsylvania: "pa",
  illinois: "il",
  georgia: "ga",
  "north carolina": "nc",
  "south carolina": "sc",
  arizona: "az",
  colorado: "co",
  nevada: "nv",
  washington: "wa",
};

/** Distinctive short aliases allowed as LIKE terms (avoid bare 2-letter codes). */
const SAFE_SHORT_ALIASES = new Set(["nyc"]);

/**
 * Padded abbreviation forms for SQL LIKE — never bare "fl"/"ny".
 * Matches common profile strings like "FL and NY", "Palm Beach, FL", "NY/NJ".
 */
export function paddedAbbreviationLikeTerms(abbr: string): string[] {
  const a = abbr.trim().toLowerCase();
  if (!/^[a-z]{2}$/.test(a)) return [];
  return [`${a} `, `${a},`, ` ${a}`, ` ${a},`, ` ${a} `, `, ${a}`, `,${a}`, `/${a}`, `${a}/`, `(${a})`];
}

function resolveCanonicalKey(raw: string): string | null {
  const key = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (!key) return null;
  const canonical = normalizeCourseLocationQuery(raw).toLowerCase();
  if (MEMBER_LOCATION_ALIASES[key]) {
    return MEMBER_LOCATION_ALIASES[key]![0] === "nyc" ? "new york" : MEMBER_LOCATION_ALIASES[key]![0]!;
  }
  if (MEMBER_LOCATION_ALIASES[canonical]) {
    return MEMBER_LOCATION_ALIASES[canonical]![0] === "nyc"
      ? "new york"
      : MEMBER_LOCATION_ALIASES[canonical]![0]!;
  }
  // Alias tables store full names as first term for state keys.
  if (CANONICAL_ABBREVIATIONS[key] || CANONICAL_ABBREVIATIONS[canonical]) {
    return CANONICAL_ABBREVIATIONS[key] ? key : canonical;
  }
  return null;
}

export function expandMemberLocationSearchTerms(raw: string): string[] {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) return [];

  const key = trimmed.toLowerCase();
  const canonical = normalizeCourseLocationQuery(trimmed).toLowerCase();
  const fromAlias = MEMBER_LOCATION_ALIASES[key] ?? MEMBER_LOCATION_ALIASES[canonical];

  const terms: string[] = [];
  const seen = new Set<string>();
  const add = (term: string) => {
    if (!term || seen.has(term)) return;
    // Never emit bare 2-letter codes alone (avoids '%ny%' / '%fl%').
    if (/^[a-z]{2}$/i.test(term) && !SAFE_SHORT_ALIASES.has(term)) return;
    if (term.length < 2) return;
    seen.add(term);
    terms.push(term);
  };

  if (fromAlias) {
    for (const term of fromAlias) add(term);
  } else {
    const normalized = canonical || key;
    if (normalized.length >= 3) add(normalized);
  }

  const canonicalKey =
    (fromAlias?.[0] === "nyc" ? "new york" : fromAlias?.[0]) ??
    resolveCanonicalKey(trimmed) ??
    canonical;
  const abbr = canonicalKey ? CANONICAL_ABBREVIATIONS[canonicalKey] : undefined;
  if (abbr) {
    for (const term of paddedAbbreviationLikeTerms(abbr)) add(term);
  }

  return terms;
}

/**
 * Build RPC filter plans for a destination with OR-style relevance.
 * Never ANDs location + travel for the same place (would require both
 * based_in-style and traveling_to-style matches).
 */
export function buildMemberDestinationSearchPlans(input: {
  location: string;
  travel: string;
  maxPlans?: number;
}): Array<{ location: string; travel: string }> {
  const maxPlans = input.maxPlans ?? 4;
  const locationTerms = expandMemberLocationSearchTerms(input.location);
  const travelTerms = expandMemberLocationSearchTerms(input.travel);

  const plans: Array<{ location: string; travel: string }> = [];
  const seen = new Set<string>();
  const add = (location: string, travel: string) => {
    const key = `${location}::${travel}`;
    if (seen.has(key)) return;
    seen.add(key);
    plans.push({ location, travel });
  };

  if (locationTerms.length === 0 && travelTerms.length === 0) {
    add(input.location, input.travel);
    return plans.slice(0, maxPlans);
  }

  for (const location of locationTerms) add(location, "");
  for (const travel of travelTerms) add("", travel);

  return plans.slice(0, maxPlans);
}
