import { earlyStageCopy, emptyGolferDefaults, type PortalGolfer } from "../data/portalSocial";
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
