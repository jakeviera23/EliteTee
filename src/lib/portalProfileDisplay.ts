import { photos } from "../assets/photos";
import { emptyGolferDefaults, earlyStageCopy } from "../data/portalSocial";
import type { PortalGolfer } from "../data/portalSocial";
import type { MemberProfileRecord } from "../types/memberProfileRecord";
import { getPortalProfileExtras, type PortalProfileExtras } from "./portalProfileExtras";

export type GolferProfileDisplay = {
  name: string;
  title: string;
  location: string;
  homeCourse: string;
  bio: string;
  isVerified: boolean;
  avatarImage: string;
  coverImage: string;
  followers: number;
  following: number;
  coursesPlayed: number;
  roundsPosted: number;
  countriesPlayed: number;
  favoriteCourses: string[];
  upcomingTravel: string;
  handicap?: number;
};

function parseOptionalNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function buildGolferProfileDisplay(
  member: MemberProfileRecord | null,
  extras?: PortalProfileExtras,
): GolferProfileDisplay {
  const userExtras = extras ?? getPortalProfileExtras(member?.user_id);

  if (!member) {
    return {
      name: "Your profile",
      title: "",
      location: "",
      homeCourse: "",
      bio: earlyStageCopy.beAmongFirst,
      isVerified: false,
      avatarImage: photos.founderPortrait,
      coverImage: userExtras.cover_image_url || photos.courseNationalGolfLinks,
      followers: 0,
      following: 0,
      coursesPlayed: parseOptionalNumber(userExtras.courses_played_count),
      roundsPosted: parseOptionalNumber(userExtras.rounds_posted),
      countriesPlayed: parseOptionalNumber(userExtras.countries_played),
      favoriteCourses: [],
      upcomingTravel: "",
      handicap: userExtras.handicap.trim() ? Number(userExtras.handicap) : undefined,
    };
  }

  const handicapText = userExtras.handicap.trim();
  const parsedHandicap = handicapText ? Number(handicapText) : undefined;

  return {
    name: member.full_name,
    title: member.industry || "",
    location: member.based_in,
    homeCourse: member.primary_club,
    bio: member.current_request || earlyStageCopy.beAmongFirst,
    isVerified: member.is_verified,
    avatarImage: member.club_logo_url?.trim() || photos.founderPortrait,
    coverImage: userExtras.cover_image_url || photos.courseNationalGolfLinks,
    followers: 0,
    following: 0,
    coursesPlayed: parseOptionalNumber(
      userExtras.courses_played_count,
      member.additional_clubs.length > 0 ? member.additional_clubs.length : 0,
    ),
    roundsPosted: parseOptionalNumber(userExtras.rounds_posted),
    countriesPlayed: parseOptionalNumber(userExtras.countries_played),
    favoriteCourses: member.additional_clubs,
    upcomingTravel: member.traveling_to || "",
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
    coursesPlayed: display.coursesPlayed,
    roundsPosted: display.roundsPosted,
    countriesPlayed: display.countriesPlayed,
  };
}
