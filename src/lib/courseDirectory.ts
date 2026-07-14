import type { GolfCourseSearchResult } from "../types/golfCourse";
import { normalizeRegionLabel } from "./courseLocationNormalization";

export type CourseSortOption =
  | "most-played"
  | "highest-rated"
  | "most-recommended"
  | "recently-reviewed"
  | "alphabetical";

export type CourseDirectoryFilters = {
  country: string;
  region: string;
  city: string;
  courseType: string;
  accessType: string;
};

export type CourseGeoRegionGroup = {
  region: string;
  courses: GolfCourseSearchResult[];
  totalCourseCount: number;
};

export type CourseGeoCountryGroup = {
  country: string;
  regions: CourseGeoRegionGroup[];
  courseCount: number;
};

export type CourseGeoCountRow = {
  country: string;
  region: string;
  course_count: number;
};

export type CourseFilterOptions = {
  countries: string[];
  regions: string[];
  cities: string[];
  courseTypes: string[];
  accessTypes: string[];
};

export const DEFAULT_COURSE_FILTERS: CourseDirectoryFilters = {
  country: "",
  region: "",
  city: "",
  courseType: "",
  accessType: "",
};

export const COURSE_SORT_LABELS: Record<CourseSortOption, string> = {
  "most-played": "Most Played",
  "highest-rated": "Highest Rated",
  "most-recommended": "Most Recommended",
  "recently-reviewed": "Recently Reviewed",
  "alphabetical": "Alphabetical",
};

export const UNSPECIFIED_COUNTRY = "Country not specified";
export const UNSPECIFIED_REGION = "Region not specified";

export function normalizeCountry(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : UNSPECIFIED_COUNTRY;
}

export function normalizeRegion(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : UNSPECIFIED_REGION;
}

export function normalizeCity(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function compareStrings(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

export function sortCourses(
  courses: GolfCourseSearchResult[],
  sortBy: CourseSortOption,
): GolfCourseSearchResult[] {
  const sorted = [...courses];

  switch (sortBy) {
    case "most-played":
      sorted.sort(
        (a, b) =>
          (b.round_count ?? 0) - (a.round_count ?? 0) ||
          compareStrings(a.name, b.name),
      );
      break;
    case "highest-rated":
      sorted.sort((a, b) => {
        const ratingA = a.avg_rating ?? -1;
        const ratingB = b.avg_rating ?? -1;
        if (ratingB !== ratingA) return ratingB - ratingA;
        return (b.round_count ?? 0) - (a.round_count ?? 0);
      });
      break;
    case "most-recommended":
      sorted.sort((a, b) => {
        const recA = a.recommend_pct ?? -1;
        const recB = b.recommend_pct ?? -1;
        if (recB !== recA) return recB - recA;
        return (b.round_count ?? 0) - (a.round_count ?? 0);
      });
      break;
    case "recently-reviewed":
      sorted.sort((a, b) => {
        const timeA = a.latest_activity_at
          ? new Date(a.latest_activity_at).getTime()
          : 0;
        const timeB = b.latest_activity_at
          ? new Date(b.latest_activity_at).getTime()
          : 0;
        return timeB - timeA || compareStrings(a.name, b.name);
      });
      break;
    case "alphabetical":
    default:
      sorted.sort((a, b) => compareStrings(a.name, b.name));
      break;
  }

  return sorted;
}

export function sortCoursesByLocationActivity(
  courses: GolfCourseSearchResult[],
): GolfCourseSearchResult[] {
  const sorted = [...courses];

  sorted.sort((a, b) => {
    const roundDiff = (b.round_count ?? 0) - (a.round_count ?? 0);
    if (roundDiff !== 0) return roundDiff;

    const timeA = a.latest_activity_at ? new Date(a.latest_activity_at).getTime() : 0;
    const timeB = b.latest_activity_at ? new Date(b.latest_activity_at).getTime() : 0;
    if (timeB !== timeA) return timeB - timeA;

    return compareStrings(a.name, b.name);
  });

  return sorted;
}

export function extractFilterOptions(
  courses: GolfCourseSearchResult[],
  active: CourseDirectoryFilters,
): CourseFilterOptions {
  const countries = new Set<string>();
  const regions = new Set<string>();
  const cities = new Set<string>();
  const courseTypes = new Set<string>();
  const accessTypes = new Set<string>();

  for (const course of courses) {
    countries.add(normalizeCountry(course.country));
    if (!active.country || normalizeCountry(course.country) === active.country) {
      const normalizedRegion = normalizeRegion(
        normalizeRegionLabel(course.country, course.region) || course.region,
      );
      regions.add(normalizedRegion);
      if (!active.region || normalizedRegion === active.region) {
        const city = normalizeCity(course.city);
        if (city) cities.add(city);
      }
    }
    if (course.course_type?.trim()) courseTypes.add(course.course_type.trim());
    if (course.access_type?.trim()) accessTypes.add(course.access_type.trim());
  }

  const sortValues = (values: Set<string>) =>
    [...values].sort((a, b) => compareStrings(a, b));

  return {
    countries: sortValues(countries),
    regions: sortValues(regions),
    cities: sortValues(cities),
    courseTypes: sortValues(courseTypes),
    accessTypes: sortValues(accessTypes),
  };
}

export function filterCourses(
  courses: GolfCourseSearchResult[],
  filters: CourseDirectoryFilters,
): GolfCourseSearchResult[] {
  return courses.filter((course) => {
    if (filters.country && normalizeCountry(course.country) !== filters.country) {
      return false;
    }
    const normalizedRegion = normalizeRegion(
      normalizeRegionLabel(course.country, course.region) || course.region,
    );
    if (filters.region && normalizedRegion !== filters.region) {
      return false;
    }
    if (filters.city && normalizeCity(course.city) !== filters.city) {
      return false;
    }
    if (filters.courseType && course.course_type?.trim() !== filters.courseType) {
      return false;
    }
    if (filters.accessType && course.access_type?.trim() !== filters.accessType) {
      return false;
    }
    return true;
  });
}

export function groupCoursesGeographically(
  courses: GolfCourseSearchResult[],
): CourseGeoCountryGroup[] {
  const countryMap = new Map<string, Map<string, GolfCourseSearchResult[]>>();

  for (const course of courses) {
    const country = normalizeCountry(course.country);
    const region = normalizeRegion(normalizeRegionLabel(course.country, course.region) || course.region);

    if (!countryMap.has(country)) {
      countryMap.set(country, new Map());
    }

    const regionMap = countryMap.get(country)!;
    if (!regionMap.has(region)) {
      regionMap.set(region, []);
    }

    regionMap.get(region)!.push(course);
  }

  return [...countryMap.entries()]
    .sort(([countryA], [countryB]) => {
      if (countryA === UNSPECIFIED_COUNTRY) return 1;
      if (countryB === UNSPECIFIED_COUNTRY) return -1;
      return compareStrings(countryA, countryB);
    })
    .map(([country, regionMap]) => {
      const regions = [...regionMap.entries()]
        .sort(([regionA], [regionB]) => {
          if (regionA === UNSPECIFIED_REGION) return 1;
          if (regionB === UNSPECIFIED_REGION) return -1;
          return compareStrings(regionA, regionB);
        })
        .map(([region, regionCourses]) => ({
          region,
          courses: regionCourses,
          totalCourseCount: regionCourses.length,
        }));

      return {
        country,
        regions,
        courseCount: regions.reduce((total, group) => total + group.totalCourseCount, 0),
      };
    });
}

function geoCountKey(country: string, region: string): string {
  return `${country}|${region}`;
}

export function buildGeoCountLookup(counts: CourseGeoCountRow[]): Map<string, number> {
  const lookup = new Map<string, number>();

  for (const row of counts) {
    const country = normalizeCountry(row.country);
    const region = normalizeRegion(
      normalizeRegionLabel(row.country, row.region) || row.region,
    );
    const key = geoCountKey(country, region);
    lookup.set(key, (lookup.get(key) ?? 0) + Number(row.course_count ?? 0));
  }

  return lookup;
}

export function applyGeoCountsToGroups(
  groups: CourseGeoCountryGroup[],
  counts: CourseGeoCountRow[],
): CourseGeoCountryGroup[] {
  const lookup = buildGeoCountLookup(counts);

  return groups.map((group) => {
    const regions = group.regions.map((regionGroup) => ({
      ...regionGroup,
      totalCourseCount:
        lookup.get(geoCountKey(group.country, regionGroup.region)) ??
        regionGroup.totalCourseCount,
    }));

    const courseCount = regions.reduce(
      (total, regionGroup) => total + regionGroup.totalCourseCount,
      0,
    );

    return {
      ...group,
      regions,
      courseCount: courseCount || group.courseCount,
    };
  });
}

export function dedupeCoursesForDirectory(
  courses: GolfCourseSearchResult[],
): GolfCourseSearchResult[] {
  const byIdentity = new Map<string, GolfCourseSearchResult>();

  for (const course of courses) {
    const country = normalizeCountry(course.country);
    const region = normalizeRegion(
      normalizeRegionLabel(course.country, course.region) || course.region,
    );
    const city = normalizeCity(course.city).toLowerCase();
    const name = course.name.trim().toLowerCase();
    const key = `${name}|${city}|${country}|${region}`;

    const existing = byIdentity.get(key);
    if (!existing) {
      byIdentity.set(key, course);
      continue;
    }

    const existingScore =
      (existing.round_count ?? 0) * 1000 + (existing.avg_rating ?? 0);
    const nextScore = (course.round_count ?? 0) * 1000 + (course.avg_rating ?? 0);
    if (nextScore > existingScore) {
      byIdentity.set(key, course);
    }
  }

  return [...byIdentity.values()];
}

export function buildFeaturedSections({
  popular,
  pool,
  limit = 6,
}: {
  popular: GolfCourseSearchResult[];
  pool: GolfCourseSearchResult[];
  limit?: number;
}) {
  function takeUniqueInCategory(courses: GolfCourseSearchResult[]) {
    const seen = new Set<string>();
    const result: GolfCourseSearchResult[] = [];

    for (const course of courses) {
      if (seen.has(course.id)) continue;
      seen.add(course.id);
      result.push(course);
      if (result.length >= limit) break;
    }

    return result;
  }

  const featuredPool = dedupeCoursesForDirectory([...popular, ...pool]);

  const highestRated = takeUniqueInCategory(
    sortCourses(
      featuredPool.filter(
        (course) =>
          (course.avg_rating ?? 0) > 0 &&
          (course.round_count ?? 0) > 0,
      ),
      "highest-rated",
    ),
  );

  const recentlyReviewed = takeUniqueInCategory(
    sortCourses(
      featuredPool.filter((course) => Boolean(course.latest_activity_at)),
      "recently-reviewed",
    ),
  );

  const popularSection = takeUniqueInCategory(popular);

  const featuredRegions = takeUniqueInCategory(
    sortCourses(
      featuredPool.filter((course) => normalizeRegion(course.region) !== UNSPECIFIED_REGION),
      "most-played",
    ).slice(0, limit),
  );

  return {
    popular: popularSection,
    highestRated,
    recentlyReviewed,
    featuredRegions,
  };
}

export function countActiveFilters(filters: CourseDirectoryFilters): number {
  return Object.values(filters).filter(Boolean).length;
}
