import type { GolfCourseRecord } from "../types/golfCourse";
import { isMemberSubmittedCourse } from "../types/golfCourse";
import {
  buildCourseLocationSnapshot,
  hasCorrectMemberSubmittedStructuredLocation,
  mergeStructuredCourseLocation,
  resolveMemberSubmittedLocationCleanup,
  type ParsedCourseLocation,
} from "./courseLocationParse";

export type StructuredCourseLocationInput = {
  city: string;
  region: string;
  country: string;
};

export function isMemberSubmittedGolfCourseRecord(
  course: Pick<GolfCourseRecord, "source_name" | "submitted_by_member"> | null | undefined,
): boolean {
  if (!course) return false;
  return isMemberSubmittedCourse(course);
}

export function canMemberEditMemberSubmittedCourseLocation(input: {
  course: Pick<GolfCourseRecord, "source_name" | "submitted_by_member"> | null | undefined;
  roundOwnerUserId: string | null | undefined;
  currentUserId: string | null | undefined;
}): boolean {
  if (!input.currentUserId || !input.roundOwnerUserId) return false;
  if (input.currentUserId !== input.roundOwnerUserId) return false;
  return isMemberSubmittedGolfCourseRecord(input.course);
}

export function shouldRejectProviderCourseLocationEdit(
  course: Pick<GolfCourseRecord, "source_name" | "submitted_by_member"> | null | undefined,
): boolean {
  if (!course) return true;
  return !isMemberSubmittedGolfCourseRecord(course);
}

export function resolveEditableCourseLocation(input: {
  course?: Pick<GolfCourseRecord, "city" | "region" | "country"> | null;
  roundLocation?: string | null;
}): ParsedCourseLocation {
  return mergeStructuredCourseLocation({
    city: input.course?.city,
    region: input.course?.region,
    country: input.course?.country,
    fallbackLocation: input.roundLocation,
  });
}

export function validateStructuredCourseLocationInput(
  input: StructuredCourseLocationInput,
): { ok: true; snapshot: string } | { ok: false; message: string } {
  const city = input.city.trim();
  const region = input.region.trim();
  const country = input.country.trim();

  if (!city) {
    return { ok: false, message: "City is required." };
  }

  if (!region) {
    return { ok: false, message: "State / region is required." };
  }

  if (!country) {
    return { ok: false, message: "Country is required." };
  }

  return {
    ok: true,
    snapshot: buildCourseLocationSnapshot({ city, region, country }),
  };
}

export function isEligibleForMemberSubmittedLocationCleanup(
  course: Pick<GolfCourseRecord, "source_name" | "submitted_by_member">,
): boolean {
  return isMemberSubmittedGolfCourseRecord(course);
}

export {
  hasCorrectMemberSubmittedStructuredLocation,
  resolveMemberSubmittedLocationCleanup,
};
