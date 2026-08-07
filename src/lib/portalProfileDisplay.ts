import { emptyGolferDefaults, type PortalGolfer } from "../data/portalSocial";
import type { MemberProfileRecord } from "../types/memberProfileRecord";

export type GolferProfileDisplay = {
  name: string;
  title: string;
  location: string;
  homeCourse: string;
  bio: string;
  isVerified: boolean;
  avatarImage: string;
  coverImage: string;
  favoriteCourses: string[];
  upcomingTravel: string;
  connectionInterests: string[];
  handicap?: number;
  isEmpty: boolean;
};

export type GolferProfileMediaUrls = {
  coverImageUrl?: string | null;
  avatarImageUrl?: string | null;
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
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function buildGolferProfileDisplay(
  member: MemberProfileRecord | null,
  _extras?: unknown,
  mediaUrls?: GolferProfileMediaUrls,
): GolferProfileDisplay {
  const coverImage = mediaUrls?.coverImageUrl?.trim() ?? "";
  const avatarImage = mediaUrls?.avatarImageUrl?.trim() ?? "";

  if (!member) {
    return {
      name: "Your profile",
      title: "",
      location: "",
      homeCourse: "",
      bio: "",
      isVerified: false,
      avatarImage,
      coverImage,
      favoriteCourses: [],
      upcomingTravel: "",
      connectionInterests: [],
      handicap: undefined,
      isEmpty: true,
    };
  }

  const clubs = splitClubValues([member.primary_club, ...member.additional_clubs]);
  const homeCourse = clubs[0] ?? "";

  return {
    name: member.full_name,
    title: formatProfileIndustryForDisplay(member.industry || ""),
    location: member.based_in,
    homeCourse,
    bio: member.current_request || "",
    isVerified: member.is_verified,
    avatarImage,
    coverImage,
    favoriteCourses: clubs.slice(1),
    upcomingTravel: member.traveling_to || "",
    connectionInterests: member.golf_interests,
    handicap: parseHandicap(member.handicap),
    isEmpty: false,
  };
}

export function buildComposerAuthor(
  member: MemberProfileRecord | null,
  _extras?: unknown,
  mediaUrls?: GolferProfileMediaUrls,
): PortalGolfer {
  const display = buildGolferProfileDisplay(member, undefined, mediaUrls);

  return {
    ...emptyGolferDefaults,
    id: member?.user_id ?? emptyGolferDefaults.id,
    name: display.name === "Your profile" ? "Member" : display.name,
    handle: display.name.toLowerCase().replace(/\s+/g, "") || "member",
    location: display.location,
    homeCourse: display.homeCourse,
    handicap: display.handicap,
    bio: display.bio,
    title: display.title,
    isVerified: display.isVerified,
    avatarImage: display.avatarImage,
    coverImage: display.coverImage,
    favoriteCourses: display.favoriteCourses,
    upcomingTravel: display.upcomingTravel || undefined,
    coursesPlayed: 0,
    roundsPosted: 0,
    countriesPlayed: 0,
  };
}
