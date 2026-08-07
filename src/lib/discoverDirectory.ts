import type { MemberProfileRecord } from "../types/memberProfileRecord";
import { normalizeCountryValue } from "./courseLocationParse";
import { US_STATE_CANONICAL, normalizeRegionLabel } from "./courseLocationNormalization";

export type DiscoverSortOption =
  | "most-relevant"
  | "recently-joined"
  | "most-active"
  | "founding-members"
  | "alphabetical";

export type DiscoverFilters = {
  query: string;
  location: string;
  club: string;
  city: string;
  region: string;
  country: string;
  industry: string;
  golfInterest: string;
  businessInterest: string;
  travelDestination: string;
  currentRequest: string;
};

export type DiscoverFilterOptions = {
  locations: string[];
  clubs: string[];
  cities: string[];
  regions: string[];
  countries: string[];
  industries: string[];
  golfInterests: string[];
  businessInterests: string[];
  travelDestinations: string[];
  currentRequests: string[];
};

export type DiscoverFeaturedSection = {
  id: "suggested" | "new-members" | "traveling-soon" | "looking-to-connect" | "founding-members";
  title: string;
  members: MemberProfileRecord[];
};

export const DEFAULT_DISCOVER_FILTERS: DiscoverFilters = {
  query: "",
  location: "",
  club: "",
  city: "",
  region: "",
  country: "",
  industry: "",
  golfInterest: "",
  businessInterest: "",
  travelDestination: "",
  currentRequest: "",
};

export const DISCOVER_SORT_LABELS: Record<DiscoverSortOption, string> = {
  "most-relevant": "Most Relevant",
  "recently-joined": "Recently Joined",
  "most-active": "Most Active",
  "founding-members": "Founding Members",
  alphabetical: "A–Z",
};

export function excludeCurrentDiscoverMember(
  members: MemberProfileRecord[],
  viewer: MemberProfileRecord | null,
): MemberProfileRecord[] {
  return members.filter(
    (member) =>
      member.id !== viewer?.id &&
      (!viewer?.user_id || member.user_id !== viewer.user_id),
  );
}

const FEATURED_SECTION_LIMIT = 6;
const CONCISE_FEATURED_SECTION_LIMIT = 3;
const CONCISE_FEATURED_SECTION_COUNT = 2;
const CONCISE_FEATURED_MEMBER_LIMIT = 3;

function compareStrings(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

function normalizeText(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort(compareStrings);
}

function cleanDerivedValue(value: string): string {
  return value.trim().replace(/\s+/g, " ").replace(/[.,;:]+$/, "");
}

function titleCaseDerivedValue(value: string): string {
  const cleaned = cleanDerivedValue(value);
  if (!cleaned || /[A-Z].*[A-Z]/.test(cleaned)) return cleaned;
  return cleaned.replace(/\b\w/g, (character) => character.toUpperCase());
}

export function normalizeDiscoverCountry(value: string): string {
  return titleCaseDerivedValue(normalizeCountryValue(cleanDerivedValue(value)));
}

export function normalizeDiscoverRegion(value: string, country = ""): string {
  const cleaned = cleanDerivedValue(value);
  if (!cleaned) return "";
  const parsed = cleaned.includes(",") ? parseBasedInParts(cleaned) : null;
  const candidate = cleanDerivedValue(parsed?.region || cleaned);
  const state = US_STATE_CANONICAL[candidate.toUpperCase()];
  if (state) return state;
  return titleCaseDerivedValue(normalizeRegionLabel(country, candidate));
}

const INDUSTRY_RULES: Array<[RegExp, string]> = [
  [/financ|bank|invest|private equity|venture capital|wealth/i, "Finance & Investing"],
  [/real estate|property|development/i, "Real Estate"],
  [/hospitality|hotel|travel|tourism/i, "Hospitality & Travel"],
  [/technology|software|tech|saas/i, "Technology"],
  [/health|medical|medicine|pharma/i, "Healthcare"],
  [/law|legal|attorney/i, "Law"],
  [/media|advertis|marketing|publishing/i, "Media & Marketing"],
  [/sport|golf/i, "Sports & Golf"],
  [/education|university|school/i, "Education"],
  [/consult/i, "Consulting"],
  [/manufactur|industrial/i, "Manufacturing"],
  [/retail|consumer/i, "Retail & Consumer"],
];

export function normalizeDiscoverIndustry(value: string): string {
  const cleaned = cleanDerivedValue(value);
  if (!cleaned || /^(not specified|n\/a|none)$/i.test(cleaned)) return "";
  return INDUSTRY_RULES.find(([pattern]) => pattern.test(cleaned))?.[1] ?? "";
}

const INTEREST_RULES: Array<[RegExp, string]> = [
  [/architect|design|history of courses/i, "Golf architecture"],
  [/travel|trip|destination/i, "Golf travel"],
  [/introduc|connect|meet|relationship|like-minded|likeminded/i, "Member introductions"],
  [/weekend|game|round/i, "Games & rounds"],
  [/business|professional|network/i, "Business golf"],
  [/new course|discover|top course|best course/i, "Course discovery"],
  [/compet|tournament/i, "Competition"],
  [/host|hospitality/i, "Hosting"],
  [/private club|club access/i, "Private club access"],
  [/friend/i, "Friendship"],
];

export function normalizeDiscoverGolfInterests(values: string[]): string[] {
  const normalized: string[] = [];
  for (const rawValue of values) {
    const pieces = rawValue.split(/[,;\n]+/).map(cleanDerivedValue).filter(Boolean);
    for (const piece of pieces) {
      const matches = INTEREST_RULES.filter(([pattern]) => pattern.test(piece)).map(([, label]) => label);
      if (matches.length > 0) {
        normalized.push(...matches);
      } else if (piece.length <= 36 && piece.split(/\s+/).length <= 5) {
        normalized.push(titleCaseDerivedValue(piece));
      }
    }
  }
  return uniqueSorted(normalized);
}

const EMPTY_CLUB_VALUE = /^(none|n\/a|not specified)$/i;

function isValidClubValue(value: string): boolean {
  const cleaned = cleanDerivedValue(value);
  return cleaned.length >= 2 && !EMPTY_CLUB_VALUE.test(cleaned);
}

/** Member-facing home club: first explicit value from primary_club only. */
export function getMemberPrimaryClub(member: MemberProfileRecord): string {
  const firstPrimary = member.primary_club
    .split(/[,;\n]+/)
    .map(cleanDerivedValue)
    .find(isValidClubValue);

  return firstPrimary ?? "";
}

export function getDiscoverMemberClubs(member: MemberProfileRecord): string[] {
  return uniqueSorted(
    [member.primary_club, ...member.additional_clubs]
      .flatMap((value) => value.split(/[,;\n]+/))
      .map(cleanDerivedValue)
      .filter(isValidClubValue),
  );
}

function formatSharedInterestReason(interest: string): string {
  if (/member introductions/i.test(interest)) {
    return "Interested in introductions";
  }
  return `Shared interest · ${interest}`;
}

/** One subtle, member-facing context line for recommendation cards. */
export function formatMemberCardContext(
  viewer: MemberProfileRecord | null,
  member: MemberProfileRecord,
): string | null {
  if (!viewer?.user_id || viewer.user_id === member.user_id) return null;

  if (member.traveling_to.trim()) {
    return `Traveling to ${member.traveling_to.trim()}`;
  }

  const viewerGolf = new Set(
    normalizeDiscoverGolfInterests(viewer.golf_interests).map((interest) => normalizeText(interest)),
  );
  for (const interest of normalizeDiscoverGolfInterests(member.golf_interests)) {
    if (viewerGolf.has(normalizeText(interest))) {
      return formatSharedInterestReason(interest);
    }
  }

  const viewerBusiness = new Set(
    viewer.business_interests.map((interest) => normalizeText(interest)),
  );
  for (const interest of member.business_interests) {
    if (viewerBusiness.has(normalizeText(interest))) {
      return `Shared interest · ${interest.trim()}`;
    }
  }

  const viewerRegions = new Set(viewer.regions.map((region) => normalizeText(region)));
  for (const region of member.regions) {
    if (viewerRegions.has(normalizeText(region))) {
      return `Same region · ${region}`;
    }
  }

  if (
    viewer.based_in.trim() &&
    normalizeText(viewer.based_in) === normalizeText(member.based_in)
  ) {
    return "Same location";
  }

  const viewerClub = getMemberPrimaryClub(viewer);
  const memberClub = getMemberPrimaryClub(member);
  if (viewerClub && memberClub && normalizeText(viewerClub) === normalizeText(memberClub)) {
    return "Same home club";
  }

  return null;
}

export function getDiscoverMemberGeo(member: MemberProfileRecord): {
  city: string;
  regions: string[];
  countries: string[];
} {
  const parsed = parseBasedInParts(member.based_in);
  const country = normalizeDiscoverCountry(parsed.country);
  const regions = uniqueSorted([
    normalizeDiscoverRegion(parsed.region, country),
    ...member.regions.map((region) => normalizeDiscoverRegion(region, country)),
  ]);
  return {
    city: titleCaseDerivedValue(parsed.city),
    regions,
    countries: country ? [country] : [],
  };
}

export function parseBasedInParts(basedIn: string): { city: string; region: string; country: string } {
  const parts = basedIn
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return { city: "", region: "", country: "" };
  }

  if (parts.length === 1) {
    return { city: parts[0] ?? "", region: "", country: "" };
  }

  if (parts.length === 2) {
    return { city: parts[0] ?? "", region: parts[1] ?? "", country: "" };
  }

  return {
    city: parts[0] ?? "",
    region: parts[parts.length - 2] ?? "",
    country: parts[parts.length - 1] ?? "",
  };
}

export function extractDiscoverFilterOptions(members: MemberProfileRecord[]): DiscoverFilterOptions {
  const locations: string[] = [];
  const clubs: string[] = [];
  const cities: string[] = [];
  const regions: string[] = [];
  const countries: string[] = [];
  const industries: string[] = [];
  const golfInterests: string[] = [];
  const businessInterests: string[] = [];
  const travelDestinations: string[] = [];
  const currentRequests: string[] = [];

  for (const member of members) {
    if (member.based_in.trim()) locations.push(member.based_in.trim());
    clubs.push(...getDiscoverMemberClubs(member));
    const normalizedIndustry = normalizeDiscoverIndustry(member.industry);
    if (normalizedIndustry) industries.push(normalizedIndustry);
    if (member.traveling_to.trim()) travelDestinations.push(member.traveling_to.trim());

    golfInterests.push(...normalizeDiscoverGolfInterests(member.golf_interests));
    businessInterests.push(...member.business_interests);
    const geo = getDiscoverMemberGeo(member);
    if (geo.city) cities.push(geo.city);
    regions.push(...geo.regions);
    countries.push(...geo.countries);
  }

  return {
    locations: uniqueSorted(locations),
    clubs: uniqueSorted(clubs),
    cities: uniqueSorted(cities),
    regions: uniqueSorted(regions),
    countries: uniqueSorted(countries),
    industries: uniqueSorted(industries),
    golfInterests: uniqueSorted(golfInterests),
    businessInterests: uniqueSorted(businessInterests),
    travelDestinations: uniqueSorted(travelDestinations),
    currentRequests: uniqueSorted(currentRequests),
  };
}

export function countActiveDiscoverFilters(filters: DiscoverFilters): number {
  return Object.entries(filters).filter(([key, value]) => key !== "query" && value.trim()).length;
}

function memberMatchesQuery(member: MemberProfileRecord, query: string): boolean {
  const geo = getDiscoverMemberGeo(member);
  const haystack = [
    member.full_name,
    ...getDiscoverMemberClubs(member),
    member.based_in,
    geo.city,
    ...geo.regions,
    ...geo.countries,
    member.traveling_to,
    normalizeDiscoverIndustry(member.industry),
    ...normalizeDiscoverGolfInterests(member.golf_interests),
    ...member.business_interests,
    ...member.regions,
    member.founding_member_number ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function memberMatchesField(value: string, filterValue: string): boolean {
  if (!filterValue.trim()) return true;
  return normalizeText(value).includes(normalizeText(filterValue));
}

export function filterDiscoverMembers(
  members: MemberProfileRecord[],
  filters: DiscoverFilters,
): MemberProfileRecord[] {
  const query = filters.query.trim().toLowerCase();

  return members.filter((member) => {
    const geo = getDiscoverMemberGeo(member);

    if (query && !memberMatchesQuery(member, query)) return false;
    if (filters.location && !memberMatchesField(member.based_in, filters.location)) return false;
    if (filters.club && !getDiscoverMemberClubs(member).some((club) => normalizeText(club) === normalizeText(filters.club))) {
      return false;
    }
    if (filters.city && normalizeText(geo.city) !== normalizeText(filters.city)) {
      return false;
    }
    if (
      filters.region &&
      !geo.regions.some((region) => normalizeText(region) === normalizeText(filters.region))
    ) {
      return false;
    }
    if (filters.country && !geo.countries.some((country) => normalizeText(country) === normalizeText(filters.country))) {
      return false;
    }
    if (filters.industry && normalizeText(normalizeDiscoverIndustry(member.industry)) !== normalizeText(filters.industry)) {
      return false;
    }
    if (
      filters.golfInterest &&
      !normalizeDiscoverGolfInterests(member.golf_interests).some(
        (interest) =>
          normalizeDiscoverGolfInterests([filters.golfInterest]).some(
            (filterInterest) => normalizeText(interest) === normalizeText(filterInterest),
          ),
      )
    ) {
      return false;
    }
    if (
      filters.businessInterest &&
      !member.business_interests.some(
        (interest) => normalizeText(interest) === normalizeText(filters.businessInterest),
      )
    ) {
      return false;
    }
    if (
      filters.travelDestination &&
      normalizeText(member.traveling_to) !== normalizeText(filters.travelDestination)
    ) {
      return false;
    }
    if (
      filters.currentRequest &&
      !memberMatchesField(member.current_request, filters.currentRequest)
    ) {
      return false;
    }

    return true;
  });
}

export function scoreMemberRelevance(
  viewer: MemberProfileRecord | null,
  member: MemberProfileRecord,
): number {
  if (!viewer?.user_id || viewer.user_id === member.user_id) return 0;

  let categoryScore = 0;
  const viewerRegions = new Set(viewer.regions.map((region) => normalizeText(region)));
  const viewerGolf = new Set(
    normalizeDiscoverGolfInterests(viewer.golf_interests).map((interest) => normalizeText(interest)),
  );
  const viewerBusiness = new Set(
    viewer.business_interests.map((interest) => normalizeText(interest)),
  );

  if (
    viewer.based_in.trim() &&
    normalizeText(viewer.based_in) === normalizeText(member.based_in)
  ) {
    categoryScore += 4;
  }

  for (const region of member.regions) {
    if (viewerRegions.has(normalizeText(region))) {
      categoryScore += 3;
      break;
    }
  }

  const viewerClub = getMemberPrimaryClub(viewer);
  const memberClub = getMemberPrimaryClub(member);
  if (viewerClub && memberClub && normalizeText(viewerClub) === normalizeText(memberClub)) {
    categoryScore += 3;
  }

  for (const interest of normalizeDiscoverGolfInterests(member.golf_interests)) {
    if (viewerGolf.has(normalizeText(interest))) {
      categoryScore += 2;
      break;
    }
  }

  for (const interest of member.business_interests) {
    if (viewerBusiness.has(normalizeText(interest))) {
      categoryScore += 2;
      break;
    }
  }

  if (categoryScore <= 0) return 0;

  let score = categoryScore;

  if (
    viewer.traveling_to.trim() &&
    member.based_in.trim() &&
    normalizeText(member.based_in).includes(normalizeText(viewer.traveling_to))
  ) {
    score += 2;
  }

  if (
    member.traveling_to.trim() &&
    viewer.based_in.trim() &&
    normalizeText(viewer.based_in).includes(normalizeText(member.traveling_to))
  ) {
    score += 2;
  }

  if (member.current_request.trim()) score += 0.5;
  if (member.traveling_to.trim()) score += 0.5;

  return score;
}

export function buildMatchReasons(
  viewer: MemberProfileRecord | null,
  member: MemberProfileRecord,
): string[] {
  if (!viewer?.user_id || viewer.user_id === member.user_id) return [];

  const reasons: string[] = [];
  const viewerRegions = new Set(viewer.regions.map((region) => normalizeText(region)));
  const viewerGolf = new Set(
    normalizeDiscoverGolfInterests(viewer.golf_interests).map((interest) => normalizeText(interest)),
  );
  const viewerBusiness = new Set(
    viewer.business_interests.map((interest) => normalizeText(interest)),
  );

  for (const region of member.regions) {
    if (viewerRegions.has(normalizeText(region))) {
      reasons.push(`Same region · ${region}`);
      break;
    }
  }

  if (
    viewer.based_in.trim() &&
    normalizeText(viewer.based_in) === normalizeText(member.based_in)
  ) {
    reasons.push("Same location");
  }

  const viewerClub = getMemberPrimaryClub(viewer);
  const memberClub = getMemberPrimaryClub(member);
  if (viewerClub && memberClub && normalizeText(viewerClub) === normalizeText(memberClub)) {
    reasons.push("Same home club");
  }

  for (const interest of normalizeDiscoverGolfInterests(member.golf_interests)) {
    if (viewerGolf.has(normalizeText(interest))) {
      reasons.push(formatSharedInterestReason(interest));
    }
  }

  for (const interest of member.business_interests) {
    if (viewerBusiness.has(normalizeText(interest))) {
      reasons.push(`Shared interest · ${interest.trim()}`);
    }
  }

  if (member.traveling_to.trim()) {
    reasons.push(`Traveling to ${member.traveling_to}`);
  }

  return [...new Set(reasons)].slice(0, 4);
}

export function sortDiscoverMembers(
  members: MemberProfileRecord[],
  sortBy: DiscoverSortOption,
  viewer: MemberProfileRecord | null = null,
): MemberProfileRecord[] {
  const sorted = [...members];

  switch (sortBy) {
    case "most-relevant":
      return sorted.sort((a, b) => {
        const scoreDiff = scoreMemberRelevance(viewer, b) - scoreMemberRelevance(viewer, a);
        if (scoreDiff !== 0) return scoreDiff;
        return compareStrings(a.full_name, b.full_name);
      });
    case "recently-joined":
      return sorted.sort((a, b) => {
        const dateDiff = Date.parse(b.created_at) - Date.parse(a.created_at);
        if (Number.isFinite(dateDiff) && dateDiff !== 0) return dateDiff;
        return compareStrings(a.full_name, b.full_name);
      });
    case "most-active":
      return sorted.sort((a, b) => {
        const dateDiff = Date.parse(b.updated_at) - Date.parse(a.updated_at);
        if (Number.isFinite(dateDiff) && dateDiff !== 0) return dateDiff;
        return compareStrings(a.full_name, b.full_name);
      });
    case "founding-members":
      return sorted.sort((a, b) => {
        const aFounding = a.founding_member_number?.trim() ?? "";
        const bFounding = b.founding_member_number?.trim() ?? "";
        if (aFounding && !bFounding) return -1;
        if (!aFounding && bFounding) return 1;
        if (aFounding && bFounding) {
          const foundingDiff = compareStrings(aFounding, bFounding);
          if (foundingDiff !== 0) return foundingDiff;
        }
        return compareStrings(a.full_name, b.full_name);
      });
    case "alphabetical":
    default:
      return sorted.sort((a, b) => compareStrings(a.full_name, b.full_name));
  }
}

export function buildFeaturedDiscoverSections(
  members: MemberProfileRecord[],
  viewer: MemberProfileRecord | null,
): DiscoverFeaturedSection[] {
  const others = members.filter((member) => member.user_id !== viewer?.user_id);
  const sections: DiscoverFeaturedSection[] = [];

  const suggested = sortDiscoverMembers(others, "most-relevant", viewer)
    .filter((member) => scoreMemberRelevance(viewer, member) > 0)
    .slice(0, FEATURED_SECTION_LIMIT);

  if (suggested.length > 0) {
    sections.push({ id: "suggested", title: "Suggested for You", members: suggested });
  }

  const newMembers = sortDiscoverMembers(others, "recently-joined")
    .filter((member) => member.created_at.trim() || member.updated_at.trim())
    .slice(0, FEATURED_SECTION_LIMIT);

  if (newMembers.length > 0) {
    sections.push({ id: "new-members", title: "New Members", members: newMembers });
  }

  const travelingSoon = others
    .filter((member) => member.traveling_to.trim())
    .sort((a, b) => compareStrings(a.traveling_to, b.traveling_to))
    .slice(0, FEATURED_SECTION_LIMIT);

  if (travelingSoon.length > 0) {
    sections.push({ id: "traveling-soon", title: "Traveling Soon", members: travelingSoon });
  }

  const lookingToConnect = others
    .filter((member) => member.current_request.trim())
    .sort((a, b) => compareStrings(a.current_request, b.current_request))
    .slice(0, FEATURED_SECTION_LIMIT);

  if (lookingToConnect.length > 0) {
    sections.push({
      id: "looking-to-connect",
      title: "Looking to Connect",
      members: lookingToConnect,
    });
  }

  const foundingMembers = others
    .filter((member) => member.founding_member_number?.trim())
    .sort((a, b) =>
      compareStrings(a.founding_member_number ?? "", b.founding_member_number ?? ""),
    )
    .slice(0, FEATURED_SECTION_LIMIT);

  if (foundingMembers.length > 0) {
    sections.push({ id: "founding-members", title: "Founding Members", members: foundingMembers });
  }

  return sections;
}

/**
 * Editorial home for Discover: a member appears in at most one preview rail and
 * no more than two rails are shown. The full directory can render the remaining
 * members once, avoiding the same small community being repeated down the page.
 */
export function buildConciseFeaturedDiscoverSections(
  members: MemberProfileRecord[],
  viewer: MemberProfileRecord | null,
): DiscoverFeaturedSection[] {
  const seenMemberIds = new Set<string>();
  const concise: DiscoverFeaturedSection[] = [];

  for (const section of buildFeaturedDiscoverSections(members, viewer)) {
    const remainingSlots = CONCISE_FEATURED_MEMBER_LIMIT - seenMemberIds.size;
    if (remainingSlots <= 0) break;
    const uniqueMembers = section.members
      .filter((member) => !seenMemberIds.has(member.id))
      .slice(0, Math.min(CONCISE_FEATURED_SECTION_LIMIT, remainingSlots));

    if (uniqueMembers.length === 0) continue;
    uniqueMembers.forEach((member) => seenMemberIds.add(member.id));
    concise.push({ ...section, members: uniqueMembers });

    if (concise.length === CONCISE_FEATURED_SECTION_COUNT) break;
  }

  return concise;
}

export type DiscoverGeoGroup = {
  label: string;
  count: number;
  filterKey: "country" | "region" | "city" | "travelDestination";
  filterValue: string;
};

export function buildDiscoverGeoGroups(members: MemberProfileRecord[]): DiscoverGeoGroup[] {
  const counts = new Map<string, DiscoverGeoGroup>();

  function addGroup(
    filterKey: DiscoverGeoGroup["filterKey"],
    filterValue: string,
    labelPrefix: string,
  ) {
    const trimmed = filterValue.trim();
    if (!trimmed) return;
    const key = `${filterKey}:${trimmed.toLowerCase()}`;
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
      return;
    }
    counts.set(key, {
      label: `${labelPrefix}: ${trimmed}`,
      count: 1,
      filterKey,
      filterValue: trimmed,
    });
  }

  for (const member of members) {
    const geo = getDiscoverMemberGeo(member);
    addGroup("city", geo.city, "City");
    for (const region of geo.regions) {
      addGroup("region", region, "Region");
    }
    for (const country of geo.countries) {
      addGroup("country", country, "Country");
    }
    addGroup("travelDestination", member.traveling_to, "Travel");
  }

  return [...counts.values()]
    .sort((a, b) => b.count - a.count || compareStrings(a.label, b.label))
    .slice(0, 12);
}

export function formatMemberActivitySummary(updatedAt: string): string | null {
  if (!updatedAt.trim()) return null;
  const parsed = Date.parse(updatedAt);
  if (!Number.isFinite(parsed)) return null;

  const daysAgo = Math.floor((Date.now() - parsed) / (1000 * 60 * 60 * 24));
  if (daysAgo < 0) return null;
  if (daysAgo === 0) return "Active today";
  if (daysAgo === 1) return "Active yesterday";
  if (daysAgo <= 30) return `Active ${daysAgo} days ago`;
  if (daysAgo <= 90) {
    return `Updated ${new Date(parsed).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    })}`;
  }
  return null;
}

export function selectInterestChips(member: MemberProfileRecord, limit = 4): string[] {
  const combined = [
    ...normalizeDiscoverGolfInterests(member.golf_interests),
    ...member.business_interests.map(cleanDerivedValue).filter(Boolean),
  ];
  return combined.slice(0, limit);
}

export function truncateDiscoverText(value: string, maxLength = 96): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
}
