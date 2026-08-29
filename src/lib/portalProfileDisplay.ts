import { earlyStageCopy, emptyGolferDefaults, type PortalGolfer } from "../data/portalSocial";
import type { MemberProfileRecord } from "../types/memberProfileRecord";

const PROFILE_PLACEHOLDER_VALUES = new Set([
  "not specified",
  "not shared",
  "n/a",
  "na",
  "none",
  "location not set",
  "location not available",
  "location not shared",
  "club not shared",
]);

export const PROFILE_TAG_MAX_LENGTH = 48;

export function isMeaningfulProfileText(value: unknown) {
  if (value === null || value === undefined) return false;

  const text = String(value).trim();
  if (!text) return false;

  return !PROFILE_PLACEHOLDER_VALUES.has(text.toLowerCase());
}

export function partitionProfileDisplayItems(items: string[], maxTagLength = PROFILE_TAG_MAX_LENGTH) {
  const tags: string[] = [];
  const textItems: string[] = [];

  for (const item of items) {
    const trimmed = item.trim();
    if (!trimmed || !isMeaningfulProfileText(trimmed)) continue;

    if (trimmed.length <= maxTagLength && !trimmed.includes("\n")) {
      tags.push(trimmed);
      continue;
    }

    textItems.push(trimmed);
  }

  return { tags, textItems };
}

export type GolferProfileDisplay = {
  name: string;
  /** Personal headline stored in member.industry (edit form: Headline). */
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
      bio: earlyStageCopy.profileOnboarding,
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

  return {
    name: member.full_name,
    title: member.industry || "",
    location: member.based_in,
    homeCourse: member.primary_club,
    bio: member.current_request || earlyStageCopy.profileOnboarding,
    isVerified: member.is_verified,
    avatarImage,
    coverImage,
    favoriteCourses: member.additional_clubs,
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
