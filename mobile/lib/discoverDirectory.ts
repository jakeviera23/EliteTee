import type { MobileMemberProfile } from "@/types/member";
import { isMeaningfulDisplayValue } from "./display";

export type MobileDiscoverFilters = {
  query: string;
  club: string;
  location: string;
  golfInterest: string;
};

export type MobileDiscoverFilterOptions = {
  clubs: string[];
  locations: string[];
  golfInterests: string[];
};

export type MobileDiscoverFeaturedSection = {
  id: "suggested" | "looking-to-connect" | "traveling-soon";
  title: string;
  members: MobileMemberProfile[];
};

export const DEFAULT_MOBILE_DISCOVER_FILTERS: MobileDiscoverFilters = {
  query: "",
  club: "",
  location: "",
  golfInterest: "",
};

export const MOBILE_DISCOVER_FEATURED_LIMIT = 6;

function compareStrings(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

function normalizeText(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort(compareStrings);
}

export function hasUsableDiscoverUserId(member: MobileMemberProfile): boolean {
  return Boolean(member.user_id?.trim());
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

export function extractMobileDiscoverFilterOptions(
  members: MobileMemberProfile[],
): MobileDiscoverFilterOptions {
  const clubs: string[] = [];
  const locations: string[] = [];
  const golfInterests: string[] = [];

  for (const member of members) {
    if (member.primary_club.trim()) clubs.push(member.primary_club.trim());
    if (member.based_in.trim()) locations.push(member.based_in.trim());
    for (const region of member.regions) {
      if (region.trim()) locations.push(region.trim());
    }
    const parsed = parseBasedInParts(member.based_in);
    if (parsed.region) locations.push(parsed.region);
    if (parsed.city) locations.push(parsed.city);
    golfInterests.push(...member.golf_interests);
  }

  return {
    clubs: uniqueSorted(clubs),
    locations: uniqueSorted(locations),
    golfInterests: uniqueSorted(golfInterests),
  };
}

export function countActiveMobileDiscoverFilters(filters: MobileDiscoverFilters): number {
  return [filters.club, filters.location, filters.golfInterest].filter((value) => value.trim())
    .length;
}

function memberMatchesQuery(member: MobileMemberProfile, query: string): boolean {
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

export function filterDiscoverMembers(
  members: MobileMemberProfile[],
  filters: MobileDiscoverFilters,
): MobileMemberProfile[] {
  const query = filters.query.trim().toLowerCase();

  return members.filter((member) => {
    if (!hasUsableDiscoverUserId(member)) return false;

    const basedInParts = parseBasedInParts(member.based_in);
    const locationNeedle = normalizeText(filters.location);

    if (query && !memberMatchesQuery(member, query)) return false;

    if (filters.club && normalizeText(member.primary_club) !== normalizeText(filters.club)) {
      return false;
    }

    if (locationNeedle) {
      const locationHaystack = [
        member.based_in,
        ...member.regions,
        basedInParts.city,
        basedInParts.region,
        basedInParts.country,
      ]
        .join(" ")
        .toLowerCase();
      if (!locationHaystack.includes(locationNeedle)) return false;
    }

    if (
      filters.golfInterest &&
      !member.golf_interests.some(
        (interest) => normalizeText(interest) === normalizeText(filters.golfInterest),
      )
    ) {
      return false;
    }

    return true;
  });
}

/**
 * Deterministic relevance score adapted from web discoverDirectory.ts.
 * Uses based_in, regions, home club, interests, travel, and current request.
 */
export function scoreMemberRelevance(
  viewer: MobileMemberProfile | null,
  member: MobileMemberProfile,
): number {
  if (!viewer?.user_id || !member.user_id || viewer.user_id === member.user_id) return 0;
  if (!hasUsableDiscoverUserId(member)) return 0;

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

  if (categoryScore < 3) {
    const viewerBasedInParts = parseBasedInParts(viewer.based_in);
    const memberBasedInParts = parseBasedInParts(member.based_in);
    if (
      viewerBasedInParts.region &&
      normalizeText(viewerBasedInParts.region) === normalizeText(memberBasedInParts.region)
    ) {
      categoryScore += 3;
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

/**
 * Concise explanation chips for Suggested cards.
 * Only emits reasons supported by profile overlap / visible fields.
 */
export function buildMatchReasons(
  viewer: MobileMemberProfile | null,
  member: MobileMemberProfile,
): string[] {
  if (!viewer?.user_id || !member.user_id || viewer.user_id === member.user_id) return [];
  if (!hasUsableDiscoverUserId(member)) return [];

  const reasons: string[] = [];
  const viewerRegions = new Set(viewer.regions.map((region) => normalizeText(region)));
  const viewerGolf = new Set(viewer.golf_interests.map((interest) => normalizeText(interest)));
  const viewerBasedInParts = parseBasedInParts(viewer.based_in);
  const memberBasedInParts = parseBasedInParts(member.based_in);

  if (
    viewer.based_in.trim() &&
    normalizeText(viewer.based_in) === normalizeText(member.based_in)
  ) {
    const label =
      memberBasedInParts.region ||
      memberBasedInParts.city ||
      member.based_in.trim();
    reasons.push(`Also in ${label}`);
  } else {
    for (const region of member.regions) {
      if (viewerRegions.has(normalizeText(region))) {
        reasons.push(`Also in ${region.trim()}`);
        break;
      }
    }
    if (
      reasons.length === 0 &&
      viewerBasedInParts.region &&
      normalizeText(viewerBasedInParts.region) === normalizeText(memberBasedInParts.region)
    ) {
      reasons.push(`Also in ${memberBasedInParts.region}`);
    }
  }

  if (
    viewer.primary_club.trim() &&
    normalizeText(viewer.primary_club) === normalizeText(member.primary_club)
  ) {
    reasons.push("Same home club");
  }

  const sharedGolf = member.golf_interests.find((interest) =>
    viewerGolf.has(normalizeText(interest)),
  );
  if (sharedGolf) {
    const trimmed = sharedGolf.trim();
    reasons.push(trimmed.length <= 28 ? trimmed : "Shared golf interests");
  }

  if (isMeaningfulDisplayValue(member.traveling_to)) {
    reasons.push(`Traveling to ${member.traveling_to.trim()}`);
  }

  if (isMeaningfulDisplayValue(member.current_request)) {
    reasons.push("Looking for connections");
  }

  return [...new Set(reasons)].slice(0, 4);
}

export function buildPrimaryMatchReason(
  viewer: MobileMemberProfile | null,
  member: MobileMemberProfile,
): string | null {
  return buildMatchReasons(viewer, member)[0] ?? null;
}

export function sortDiscoverMembersByRelevance(
  members: MobileMemberProfile[],
  viewer: MobileMemberProfile | null,
): MobileMemberProfile[] {
  return [...members].sort((a, b) => {
    const scoreDiff = scoreMemberRelevance(viewer, b) - scoreMemberRelevance(viewer, a);
    if (scoreDiff !== 0) return scoreDiff;
    return compareStrings(a.full_name, b.full_name);
  });
}

export function sortDiscoverMembersAlphabetical(
  members: MobileMemberProfile[],
): MobileMemberProfile[] {
  return [...members].sort((a, b) => compareStrings(a.full_name, b.full_name));
}

/**
 * Featured rails for Mobile Discover V1.
 * Empty sections omitted. Members without usable user_id excluded.
 */
export function buildFeaturedDiscoverSections(
  members: MobileMemberProfile[],
  viewer: MobileMemberProfile | null,
): MobileDiscoverFeaturedSection[] {
  const others = members.filter(
    (member) =>
      hasUsableDiscoverUserId(member) &&
      member.user_id !== viewer?.user_id,
  );
  const sections: MobileDiscoverFeaturedSection[] = [];

  const suggested = sortDiscoverMembersByRelevance(others, viewer)
    .filter((member) => scoreMemberRelevance(viewer, member) > 0)
    .slice(0, MOBILE_DISCOVER_FEATURED_LIMIT);

  if (suggested.length > 0) {
    sections.push({ id: "suggested", title: "Suggested for you", members: suggested });
  }

  const lookingToConnect = others
    .filter((member) => isMeaningfulDisplayValue(member.current_request))
    .sort((a, b) => compareStrings(a.current_request, b.current_request))
    .slice(0, MOBILE_DISCOVER_FEATURED_LIMIT);

  if (lookingToConnect.length > 0) {
    sections.push({
      id: "looking-to-connect",
      title: "Looking to connect",
      members: lookingToConnect,
    });
  }

  const travelingSoon = others
    .filter((member) => isMeaningfulDisplayValue(member.traveling_to))
    .sort((a, b) => compareStrings(a.traveling_to, b.traveling_to))
    .slice(0, MOBILE_DISCOVER_FEATURED_LIMIT);

  if (travelingSoon.length > 0) {
    sections.push({ id: "traveling-soon", title: "Traveling soon", members: travelingSoon });
  }

  return sections;
}

export function selectInterestChips(member: MobileMemberProfile, limit = 3): string[] {
  return member.golf_interests.filter(isMeaningfulDisplayValue).slice(0, limit);
}

export function truncateDiscoverText(value: string, maxLength = 96): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
}
