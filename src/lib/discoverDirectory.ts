import type { MemberProfileRecord } from "../types/memberProfileRecord";

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
  id: "suggested" | "traveling-soon" | "new-members";
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

const FEATURED_SECTION_LIMIT = 6;
const NEW_MEMBERS_SECTION_LIMIT = 4;

function compareStrings(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

function normalizeText(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort(compareStrings);
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
    if (member.primary_club.trim()) clubs.push(member.primary_club.trim());
    if (member.industry.trim()) industries.push(member.industry.trim());
    if (member.traveling_to.trim()) travelDestinations.push(member.traveling_to.trim());
    if (member.current_request.trim()) currentRequests.push(member.current_request.trim());

    golfInterests.push(...member.golf_interests);
    businessInterests.push(...member.business_interests);
    regions.push(...member.regions);

    const parsed = parseBasedInParts(member.based_in);
    if (parsed.city) cities.push(parsed.city);
    if (parsed.region) regions.push(parsed.region);
    if (parsed.country) countries.push(parsed.country);
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
  const haystack = [
    member.full_name,
    member.primary_club,
    member.based_in,
    member.traveling_to,
    member.current_request,
    member.industry,
    ...member.golf_interests,
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
    const basedInParts = parseBasedInParts(member.based_in);

    if (query && !memberMatchesQuery(member, query)) return false;
    if (filters.location && !memberMatchesField(member.based_in, filters.location)) return false;
    if (filters.club && normalizeText(member.primary_club) !== normalizeText(filters.club)) {
      return false;
    }
    if (filters.city && normalizeText(basedInParts.city) !== normalizeText(filters.city)) {
      return false;
    }
    if (
      filters.region &&
      normalizeText(basedInParts.region) !== normalizeText(filters.region) &&
      !member.regions.some((region) => normalizeText(region) === normalizeText(filters.region))
    ) {
      return false;
    }
    if (filters.country && normalizeText(basedInParts.country) !== normalizeText(filters.country)) {
      return false;
    }
    if (filters.industry && normalizeText(member.industry) !== normalizeText(filters.industry)) {
      return false;
    }
    if (
      filters.golfInterest &&
      !member.golf_interests.some(
        (interest) => normalizeText(interest) === normalizeText(filters.golfInterest),
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
  const viewerGolf = new Set(viewer.golf_interests.map((interest) => normalizeText(interest)));
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

  if (
    viewer.primary_club.trim() &&
    normalizeText(viewer.primary_club) === normalizeText(member.primary_club)
  ) {
    categoryScore += 3;
  }

  for (const interest of member.golf_interests) {
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
  const viewerGolf = new Set(viewer.golf_interests.map((interest) => normalizeText(interest)));
  const viewerBusiness = new Set(
    viewer.business_interests.map((interest) => normalizeText(interest)),
  );

  for (const region of member.regions) {
    if (viewerRegions.has(normalizeText(region))) {
      reasons.push(`Same region: ${region}`);
      break;
    }
  }

  if (
    viewer.based_in.trim() &&
    normalizeText(viewer.based_in) === normalizeText(member.based_in)
  ) {
    reasons.push("Same location");
  }

  if (
    viewer.primary_club.trim() &&
    normalizeText(viewer.primary_club) === normalizeText(member.primary_club)
  ) {
    reasons.push("Same home club");
  }

  for (const interest of member.golf_interests) {
    if (viewerGolf.has(normalizeText(interest))) {
      reasons.push(`${interest} interest`);
    }
  }

  for (const interest of member.business_interests) {
    if (viewerBusiness.has(normalizeText(interest))) {
      reasons.push(`${interest} overlap`);
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

  const travelingSoon = others
    .filter((member) => member.traveling_to.trim())
    .sort((a, b) => compareStrings(a.traveling_to, b.traveling_to))
    .slice(0, FEATURED_SECTION_LIMIT);

  if (travelingSoon.length > 0) {
    sections.push({ id: "traveling-soon", title: "Traveling Soon", members: travelingSoon });
  }

  const newMembers = sortDiscoverMembers(others, "recently-joined")
    .filter((member) => member.created_at.trim() || member.updated_at.trim())
    .slice(0, NEW_MEMBERS_SECTION_LIMIT);

  if (newMembers.length > 0) {
    sections.push({ id: "new-members", title: "New Members", members: newMembers });
  }

  return sections;
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
    const parsed = parseBasedInParts(member.based_in);
    addGroup("city", parsed.city, "City");
    addGroup("region", parsed.region, "Region");
    addGroup("country", parsed.country, "Country");
    for (const region of member.regions) {
      addGroup("region", region, "Region");
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

export function isShortDiscoverInterest(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.length > 28) return false;
  if (trimmed.split(/\s+/).length > 4) return false;
  if (/[.!?]|:/.test(trimmed)) return false;
  return true;
}

export function selectInterestChips(member: MemberProfileRecord, limit = 2): string[] {
  const combined = [...member.golf_interests, ...member.business_interests]
    .map((value) => value.trim())
    .filter(isShortDiscoverInterest);
  return [...new Set(combined)].slice(0, limit);
}

export function truncateDiscoverText(value: string, maxLength = 96): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
}
