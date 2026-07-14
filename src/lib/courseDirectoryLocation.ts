import {
  buildGeoCountLookup,
  filterCourses,
  normalizeCountry,
  normalizeRegion,
  UNSPECIFIED_REGION,
  type CourseGeoCountRow,
} from "./courseDirectory";
import { getUsStateSearchToken, normalizeRegionLabel } from "./courseLocationNormalization";
import type { GolfCourseSearchResult } from "../types/golfCourse";

export type CoursesLocationState = {
  country: string;
  region: string;
  viewAll: boolean;
};

export type LocationBrowseStep = "countries" | "regions" | "courses" | "all";

export type LocationBrowseCountry = {
  country: string;
  courseCount: number;
};

export type LocationBrowseRegion = {
  region: string;
  courseCount: number;
};

export const COURSES_BASE_PATH = "/courses";

function compareLocationLabels(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

export function parseCoursesLocationSearchParams(
  params: URLSearchParams,
): CoursesLocationState {
  return {
    country: params.get("country")?.trim() ?? "",
    region: params.get("region")?.trim() ?? "",
    viewAll: params.get("view") === "all",
  };
}

export function buildCoursesLocationSearchParams(
  state: CoursesLocationState,
): URLSearchParams {
  const params = new URLSearchParams();

  if (state.viewAll) {
    params.set("view", "all");
    return params;
  }

  if (state.country) {
    params.set("country", state.country);
  }

  if (state.region) {
    params.set("region", state.region);
  }

  return params;
}

export function buildCoursesLocationPath(state: CoursesLocationState): string {
  const params = buildCoursesLocationSearchParams(state);
  const query = params.toString();
  return query ? `${COURSES_BASE_PATH}?${query}` : COURSES_BASE_PATH;
}

export function getLocationBrowseStep(state: CoursesLocationState): LocationBrowseStep {
  if (state.viewAll) return "all";
  if (state.country && state.region) return "courses";
  if (state.country) return "regions";
  return "countries";
}

export function buildLocationBrowseCountries(
  counts: CourseGeoCountRow[],
): LocationBrowseCountry[] {
  const totals = new Map<string, number>();

  for (const row of counts) {
    const country = normalizeCountry(row.country);
    totals.set(country, (totals.get(country) ?? 0) + Number(row.course_count ?? 0));
  }

  return [...totals.entries()]
    .sort(([countryA], [countryB]) => compareLocationLabels(countryA, countryB))
    .map(([country, courseCount]) => ({ country, courseCount }));
}

export function buildLocationBrowseRegions(
  counts: CourseGeoCountRow[],
  country: string,
): LocationBrowseRegion[] {
  const normalizedCountry = normalizeCountry(country);
  const regionTotals = new Map<string, number>();

  for (const row of counts) {
    if (normalizeCountry(row.country) !== normalizedCountry) continue;

    const region = normalizeRegion(
      normalizeRegionLabel(row.country, row.region) || row.region,
    );
    regionTotals.set(
      region,
      (regionTotals.get(region) ?? 0) + Number(row.course_count ?? 0),
    );
  }

  return [...regionTotals.entries()]
    .sort(([regionA], [regionB]) => compareLocationLabels(regionA, regionB))
    .map(([region, courseCount]) => ({ region, courseCount }));
}

export function getLocationRegionCourseCount(
  counts: CourseGeoCountRow[],
  country: string,
  region: string,
): number {
  const lookup = buildGeoCountLookup(counts);
  const normalizedCountry = normalizeCountry(country);
  const normalizedRegion = normalizeRegion(region);
  return lookup.get(`${normalizedCountry}|${normalizedRegion}`) ?? 0;
}

export function getLocationSearchQuery(country: string, region?: string): string {
  const normalizedCountry = country.trim();
  const normalizedRegion = region?.trim() ?? "";

  if (!normalizedRegion || normalizedRegion === UNSPECIFIED_REGION) {
    return normalizedCountry;
  }

  const usSearchToken = getUsStateSearchToken(normalizedCountry, normalizedRegion);
  if (usSearchToken) {
    return usSearchToken;
  }

  return normalizedRegion;
}

/** @deprecated Use getLocationSearchQuery — combined country+region strings do not match the RPC. */
export function buildLocationSearchQuery(country: string, region?: string): string {
  return getLocationSearchQuery(country, region);
}

export function courseMatchesSelectedLocation(
  course: Pick<GolfCourseSearchResult, "country" | "region" | "city" | "course_type" | "access_type">,
  location: CoursesLocationState,
): boolean {
  if (location.viewAll || (!location.country && !location.region)) {
    return true;
  }

  return filterCourses([course as GolfCourseSearchResult], {
    country: location.country,
    region: location.region,
    city: "",
    courseType: "",
    accessType: "",
  }).length > 0;
}

export function filterCoursesForSelectedLocation(
  courses: GolfCourseSearchResult[],
  location: CoursesLocationState,
): GolfCourseSearchResult[] {
  if (location.viewAll || (!location.country && !location.region)) {
    return courses;
  }

  return courses.filter((course) => courseMatchesSelectedLocation(course, location));
}

export function shouldShowLocationEmptyState({
  workingSetLength,
  isLoading,
  isPaging,
  showLocationResults,
}: {
  workingSetLength: number;
  regionCourseCount?: number;
  isLoading: boolean;
  isPaging: boolean;
  showLocationResults: boolean;
  locationStep?: LocationBrowseStep;
}): boolean {
  if (isLoading || isPaging || workingSetLength > 0) {
    return false;
  }

  return showLocationResults;
}

export function coursesLocationStatesEqual(
  left: CoursesLocationState,
  right: CoursesLocationState,
): boolean {
  return (
    left.country === right.country &&
    left.region === right.region &&
    left.viewAll === right.viewAll
  );
}
