import type { MobileMemberProfile } from "@/types/member";
import { isMeaningfulDisplayValue } from "./display";
import { getMemberDisplayName } from "./memberInitials";

export type GolferProfileDisplay = {
  name: string;
  title: string;
  location: string;
  homeCourse: string;
  bio: string;
  isVerified: boolean;
  favoriteCourses: string[];
  upcomingTravel: string;
  connectionInterests: string[];
  businessInterests: string[];
  handicap?: number;
  foundingMemberNumber: string | null;
};

function splitClubValues(values: string[]): string[] {
  const unique = new Map<string, string>();
  for (const value of values) {
    for (const club of value.split(/[,;\n]+/).map((entry) => entry.trim()).filter(Boolean)) {
      const key = club.toLocaleLowerCase();
      if (!unique.has(key)) unique.set(key, club);
    }
  }
  return [...unique.values()];
}

export function formatProfileIndustryForDisplay(value: string): string {
  const cleaned = value.trim().replace(/\s+/g, " ");
  if (!cleaned || /^(not specified|n\/?a|none|unknown)$/i.test(cleaned)) return "";
  const words = cleaned.split(" ");
  const looksLikeHeadline =
    words.length > 6 ||
    cleaned.length > 48 ||
    /[.!?]/.test(cleaned) ||
    (words.length >= 5 && cleaned === cleaned.toUpperCase());
  return looksLikeHeadline ? "" : cleaned;
}

function parseHandicap(value: string): number | undefined {
  if (!isMeaningfulDisplayValue(value)) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function buildGolferProfileDisplay(member: MobileMemberProfile | null): GolferProfileDisplay {
  if (!member) {
    return {
      name: "Member",
      title: "",
      location: "",
      homeCourse: "",
      bio: "",
      isVerified: false,
      favoriteCourses: [],
      upcomingTravel: "",
      connectionInterests: [],
      businessInterests: [],
      handicap: undefined,
      foundingMemberNumber: null,
    };
  }

  const clubs = splitClubValues([member.primary_club, ...member.additional_clubs]);

  return {
    name: getMemberDisplayName(member.full_name),
    title: formatProfileIndustryForDisplay(member.industry || ""),
    location: isMeaningfulDisplayValue(member.based_in) ? member.based_in.trim() : "",
    homeCourse: clubs[0] ?? "",
    bio: isMeaningfulDisplayValue(member.current_request) ? member.current_request.trim() : "",
    isVerified: member.is_verified,
    favoriteCourses: clubs.slice(1),
    upcomingTravel: isMeaningfulDisplayValue(member.traveling_to) ? member.traveling_to.trim() : "",
    connectionInterests: member.golf_interests.filter(isMeaningfulDisplayValue),
    businessInterests: member.business_interests.filter(isMeaningfulDisplayValue),
    handicap: parseHandicap(member.handicap),
    foundingMemberNumber: isMeaningfulDisplayValue(member.founding_member_number)
      ? member.founding_member_number!.trim()
      : null,
  };
}
