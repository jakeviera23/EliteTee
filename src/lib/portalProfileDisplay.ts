import { earlyStageCopy, emptyGolferDefaults, type PortalGolfer } from "../data/portalSocial";
import type { MemberProfileRecord } from "../types/memberProfileRecord";
import {
  getPortalProfileExtras,
  parseFavoriteCoursesFromExtras,
  type PortalProfileExtras,
} from "./portalProfileExtras";

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
  extras?: PortalProfileExtras,
  mediaUrls?: GolferProfileMediaUrls,
): GolferProfileDisplay {
  const userExtras = extras ?? getPortalProfileExtras(member?.user_id);
  const coverImage = mediaUrls?.coverImageUrl?.trim() ?? "";
  const avatarImage = mediaUrls?.avatarImageUrl?.trim() ?? "";

  if (!member) {
    const useLocal = Boolean(userExtras.has_local_snapshot);
    return {
      name: useLocal && userExtras.full_name.trim() ? userExtras.full_name : "Your profile",
      title: useLocal ? userExtras.headline : "",
      location: useLocal ? userExtras.based_in : "",
      homeCourse: useLocal ? userExtras.primary_club : "",
      bio: useLocal && userExtras.bio.trim() ? userExtras.bio : earlyStageCopy.profileOnboarding,
      isVerified: false,
      avatarImage,
      coverImage,
      favoriteCourses: useLocal
        ? parseFavoriteCoursesFromExtras(userExtras.favorite_courses)
        : [],
      upcomingTravel: useLocal ? userExtras.traveling_to : "",
      connectionInterests: [],
      handicap: parseHandicap(userExtras.handicap),
      isEmpty: true,
    };
  }

  const useLocal = Boolean(userExtras.has_local_snapshot);

  return {
    name: useLocal && userExtras.full_name.trim() ? userExtras.full_name : member.full_name,
    title: useLocal ? userExtras.headline : member.industry || "",
    location: useLocal ? userExtras.based_in : member.based_in,
    homeCourse: useLocal ? userExtras.primary_club : member.primary_club,
    bio: useLocal
      ? userExtras.bio || earlyStageCopy.profileOnboarding
      : member.current_request || earlyStageCopy.profileOnboarding,
    isVerified: member.is_verified,
    avatarImage,
    coverImage,
    favoriteCourses: useLocal
      ? parseFavoriteCoursesFromExtras(userExtras.favorite_courses)
      : member.additional_clubs,
    upcomingTravel: useLocal ? userExtras.traveling_to : member.traveling_to || "",
    connectionInterests: member.golf_interests,
    handicap: parseHandicap(userExtras.handicap),
    isEmpty: false,
  };
}

export function buildComposerAuthor(
  member: MemberProfileRecord | null,
  extras?: PortalProfileExtras,
  mediaUrls?: GolferProfileMediaUrls,
): PortalGolfer {
  const display = buildGolferProfileDisplay(member, extras, mediaUrls);

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
