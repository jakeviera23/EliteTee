import { photos } from "../assets/photos";
import { emptyGolferDefaults, earlyStageCopy } from "../data/portalSocial";
import type { PortalGolfer } from "../data/portalSocial";
import type { MemberProfileRecord } from "../types/memberProfileRecord";
import { getPortalProfileExtras, parseFavoriteCoursesFromExtras, type PortalProfileExtras } from "./portalProfileExtras";

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
};

export function buildGolferProfileDisplay(
  member: MemberProfileRecord | null,
  extras?: PortalProfileExtras,
): GolferProfileDisplay {
  const userExtras = extras ?? getPortalProfileExtras(member?.user_id);

  if (!member) {
    const useLocal = userExtras.has_local_snapshot;
    return {
      name: useLocal && userExtras.full_name.trim() ? userExtras.full_name : "Your profile",
      title: useLocal ? userExtras.headline : "",
      location: useLocal ? userExtras.based_in : "",
      homeCourse: useLocal ? userExtras.primary_club : "",
      bio: useLocal && userExtras.bio.trim() ? userExtras.bio : earlyStageCopy.beAmongFirst,
      isVerified: false,
      avatarImage:
        useLocal && userExtras.profile_photo_url.trim()
          ? userExtras.profile_photo_url
          : photos.founderPortrait,
      coverImage: userExtras.cover_image_url || photos.courseNationalGolfLinks,
      favoriteCourses: useLocal
        ? parseFavoriteCoursesFromExtras(userExtras.favorite_courses)
        : [],
      upcomingTravel: useLocal ? userExtras.traveling_to : "",
      connectionInterests: [],
      handicap: userExtras.handicap.trim() ? Number(userExtras.handicap) : undefined,
    };
  }

  const handicapText = userExtras.handicap.trim();
  const parsedHandicap = handicapText ? Number(handicapText) : undefined;
  const useLocal = userExtras.has_local_snapshot;

  return {
    name: useLocal ? userExtras.full_name : member.full_name,
    title: useLocal ? userExtras.headline : member.industry || "",
    location: useLocal ? userExtras.based_in : member.based_in,
    homeCourse: useLocal ? userExtras.primary_club : member.primary_club,
    bio: useLocal
      ? userExtras.bio || earlyStageCopy.beAmongFirst
      : member.current_request || earlyStageCopy.beAmongFirst,
    isVerified: member.is_verified,
    avatarImage: useLocal
      ? userExtras.profile_photo_url.trim() || photos.founderPortrait
      : member.club_logo_url?.trim() || photos.founderPortrait,
    coverImage: userExtras.cover_image_url || photos.courseNationalGolfLinks,
    favoriteCourses: useLocal
      ? parseFavoriteCoursesFromExtras(userExtras.favorite_courses)
      : member.additional_clubs,
    upcomingTravel: useLocal ? userExtras.traveling_to : member.traveling_to || "",
    connectionInterests: member.golf_interests,
    handicap:
      parsedHandicap !== undefined && Number.isFinite(parsedHandicap) ? parsedHandicap : undefined,
  };
}

export function buildComposerAuthor(
  member: MemberProfileRecord | null,
  extras?: PortalProfileExtras,
): PortalGolfer {
  const display = buildGolferProfileDisplay(member, extras);

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
