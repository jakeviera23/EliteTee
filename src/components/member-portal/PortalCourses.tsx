import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { experienceCopy } from "../../data/portalSocial";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import {
  buildFeaturedSections,
  countActiveFilters,
  dedupeCoursesForDirectory,
  DEFAULT_COURSE_FILTERS,
  extractFilterOptions,
  filterCourses,
  sortCourses,
  sortCoursesByLocationActivity,
  type CourseDirectoryFilters,
  type CourseGeoCountRow,
  type CourseSortOption,
} from "../../lib/courseDirectory";
import {
  buildCoursesLocationPath,
  buildLocationBrowseCountries,
  buildLocationBrowseRegions,
  courseMatchesSelectedLocation,
  filterCoursesForSelectedLocation,
  getLocationBrowseStep,
  getLocationRegionCourseCount,
  getLocationSearchQuery,
  parseCoursesLocationSearchParams,
  shouldShowLocationEmptyState,
  type CoursesLocationState,
  type LocationBrowseStep,
} from "../../lib/courseDirectoryLocation";
import {
  fetchGolfCourseDirectoryGeoCounts,
  fetchPopularGolfCourses,
  searchGolfCourses,
  SEARCH_PAGE_SIZE,
} from "../../lib/golfCourses";
import { appendUniqueCourses, restoreScrollAfterPaging } from "../../lib/courseResultsAppend";
import {
  ensureBucketListHydrated,
  getBucketListCourseIds,
} from "../../lib/portalCourseState";
import type { GolfCourseSearchResult } from "../../types/golfCourse";
import { AddCoursePlayedModal } from "./AddCoursePlayedModal";
import { CourseDirectoryCard } from "./CourseDirectoryCard";
import { CourseFeaturedSections } from "./CourseFeaturedSections";
import { CourseFilterDrawer } from "./CourseFilterDrawer";
import { CourseFiltersBar } from "./CourseFiltersBar";
import { CourseLocationBrowse } from "./CourseLocationBrowse";

const FEATURED_COURSE_LIMIT = 3;

export function PortalCourses() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const loadMoreButtonRef = useRef<HTMLButtonElement | null>(null);
  const locationState = useMemo(
    () => parseCoursesLocationSearchParams(searchParams),
    [searchParams],
  );
  const locationStep = getLocationBrowseStep(locationState);

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [featuredPool, setFeaturedPool] = useState<GolfCourseSearchResult[]>([]);
  const [locationResults, setLocationResults] = useState<GolfCourseSearchResult[]>([]);
  const [searchResults, setSearchResults] = useState<GolfCourseSearchResult[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaging, setIsPaging] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [popularCourses, setPopularCourses] = useState<GolfCourseSearchResult[]>([]);
  const [popularLoading, setPopularLoading] = useState(true);
  const [geoCounts, setGeoCounts] = useState<CourseGeoCountRow[]>([]);
  const [geoCountsLoading, setGeoCountsLoading] = useState(true);
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [directoryRefreshKey, setDirectoryRefreshKey] = useState(0);
  const [filters, setFilters] = useState<CourseDirectoryFilters>(DEFAULT_COURSE_FILTERS);
  const [sortBy, setSortBy] = useState<CourseSortOption>("most-played");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [bucketListCourseIds, setBucketListCourseIds] = useState<string[]>(() =>
    getBucketListCourseIds(),
  );

  const isSearchMode = debouncedQuery.trim().length > 0;
  const hasClientFilters = countActiveFilters(filters) > 0;
  const showLocationResults = !isSearchMode && !hasClientFilters && (locationStep === "courses" || locationStep === "all");
  const showLocationBrowse = !isSearchMode && !hasClientFilters;

  const updateLocationState = useCallback(
    (next: CoursesLocationState) => {
      const nextPath = buildCoursesLocationPath(next);
      navigate(nextPath, { replace: false });
    },
    [navigate],
  );

  const loadPopular = useCallback(async () => {
    setPopularLoading(true);
    const { data } = await fetchPopularGolfCourses(FEATURED_COURSE_LIMIT);
    setPopularCourses(data ?? []);
    setPopularLoading(false);
  }, []);

  const loadGeoCounts = useCallback(async () => {
    setGeoCountsLoading(true);
    const { data, error } = await fetchGolfCourseDirectoryGeoCounts("");
    if (error) {
      console.error("[PortalCourses] geo counts failed", error.message);
      setGeoCounts([]);
    } else {
      setGeoCounts(data ?? []);
    }
    setGeoCountsLoading(false);
  }, []);

  const loadFeaturedSnapshot = useCallback(async () => {
    const { data } = await searchGolfCourses({
      query: "",
      limit: SEARCH_PAGE_SIZE,
      offset: 0,
    });
    setFeaturedPool(data ?? []);
  }, []);

  const loadLocationPage = useCallback(
    async (
      searchQuery: string,
      searchOffset: number,
      location: CoursesLocationState,
      browseStep: LocationBrowseStep,
    ) => {
      if (searchOffset === 0) {
        setIsLoading(true);
      } else {
        setIsPaging(true);
      }
      setLoadError(null);

      const scrollY = window.scrollY;
      const { data, error } = await searchGolfCourses({
        query: searchQuery,
        limit: SEARCH_PAGE_SIZE,
        offset: searchOffset,
      });

      if (error) {
        console.error("[PortalCourses] directory load failed", error.message);
        setLoadError("Course search is unavailable right now.");
        if (searchOffset === 0) {
          setLocationResults([]);
          setSearchResults([]);
        }
        setHasMore(false);
        setIsLoading(false);
        setIsPaging(false);
        return;
      }

      const rows = (data ?? []) as GolfCourseSearchResult[];
      const searching = debouncedQuery.trim().length > 0;
      const locationFiltered =
        browseStep === "courses"
          ? filterCoursesForSelectedLocation(rows, location)
          : rows;

      if (searching) {
        if (searchOffset === 0) {
          setSearchResults(rows);
        } else {
          setSearchResults((current) => appendUniqueCourses(current, rows));
        }
      } else if (browseStep === "courses" || browseStep === "all") {
        if (searchOffset === 0) {
          setLocationResults(locationFiltered);
        } else {
          setLocationResults((current) =>
            appendUniqueCourses(current, locationFiltered),
          );
        }
      } else if (searchOffset === 0) {
        setLocationResults([]);
      }

      setOffset(searchOffset);
      setHasMore(rows.length === SEARCH_PAGE_SIZE);
      setIsLoading(false);
      setIsPaging(false);

      if (searchOffset > 0) {
        restoreScrollAfterPaging(scrollY);
      }
    },
    [debouncedQuery],
  );

  useEffect(() => {
    void loadPopular();
    void loadGeoCounts();
    void loadFeaturedSnapshot();
  }, [loadFeaturedSnapshot, loadGeoCounts, loadPopular]);

  useEffect(() => {
    let active = true;

    void ensureBucketListHydrated().then(() => {
      if (active) {
        setBucketListCourseIds(getBucketListCourseIds());
      }
    });

    function handleBucketListChanged() {
      setBucketListCourseIds(getBucketListCourseIds());
    }

    window.addEventListener("elitetee:course-state-changed", handleBucketListChanged);

    return () => {
      active = false;
      window.removeEventListener("elitetee:course-state-changed", handleBucketListChanged);
    };
  }, []);

  useEffect(() => {
    if (isSearchMode) {
      setOffset(0);
      void loadLocationPage(debouncedQuery, 0, locationState, locationStep);
      return;
    }

    if (!showLocationResults) {
      setLocationResults([]);
      setHasMore(false);
      setOffset(0);
      setIsLoading(false);
      return;
    }

    const locationQuery =
      locationStep === "courses"
        ? getLocationSearchQuery(locationState.country, locationState.region)
        : "";

    setOffset(0);
    void loadLocationPage(locationQuery, 0, locationState, locationStep);
  }, [
    debouncedQuery,
    directoryRefreshKey,
    isSearchMode,
    loadLocationPage,
    locationState,
    locationStep,
    showLocationResults,
  ]);

  async function loadMore() {
    const nextOffset = offset + SEARCH_PAGE_SIZE;
    const locationQuery = isSearchMode
      ? debouncedQuery
      : locationStep === "courses"
        ? getLocationSearchQuery(locationState.country, locationState.region)
        : "";
    await loadLocationPage(locationQuery, nextOffset, locationState, locationStep);
  }

  function openCourse(slug: string) {
    navigate(`/courses/${slug}`);
  }

  const bucketListCourseIdSet = useMemo(() => new Set(bucketListCourseIds), [bucketListCourseIds]);

  const locationBrowseCountries = useMemo(
    () => buildLocationBrowseCountries(geoCounts),
    [geoCounts],
  );

  const locationBrowseRegions = useMemo(
    () =>
      locationState.country
        ? buildLocationBrowseRegions(geoCounts, locationState.country)
        : [],
    [geoCounts, locationState.country],
  );

  const regionCourseCount = useMemo(() => {
    if (!locationState.country || !locationState.region) return 0;
    return getLocationRegionCourseCount(
      geoCounts,
      locationState.country,
      locationState.region,
    );
  }, [geoCounts, locationState.country, locationState.region]);

  const locationCourses = useMemo(() => {
    const deduped = dedupeCoursesForDirectory(locationResults);
    const sorted = sortCoursesByLocationActivity(deduped);
    return locationStep === "courses"
      ? sorted.filter((course) => courseMatchesSelectedLocation(course, locationState))
      : sorted;
  }, [locationResults, locationState, locationStep]);

  const workingSet = useMemo(() => {
    if (isSearchMode) {
      const filtered = hasClientFilters ? filterCourses(searchResults, filters) : searchResults;
      return sortCourses(dedupeCoursesForDirectory(filtered), sortBy);
    }

    if (showLocationResults) {
      if (locationStep === "all") {
        return sortCoursesByLocationActivity(dedupeCoursesForDirectory(locationResults));
      }
      return locationCourses;
    }

    return [];
  }, [
    filters,
    hasClientFilters,
    isSearchMode,
    locationCourses,
    locationResults,
    locationStep,
    searchResults,
    showLocationResults,
    sortBy,
  ]);

  const filterOptions = useMemo(
    () =>
      extractFilterOptions(
        isSearchMode ? searchResults : locationResults,
        filters,
      ),
    [filters, isSearchMode, locationResults, searchResults],
  );

  const featuredDiscovery = useMemo(() => {
    if (isSearchMode || hasClientFilters || locationStep !== "countries") {
      return null;
    }

    const featured = buildFeaturedSections({
      popular: popularCourses,
      pool: featuredPool,
      limit: FEATURED_COURSE_LIMIT,
    });

    return {
      popular: featured.popular,
      "highest-rated": featured.highestRated,
      "recently-reviewed": featured.recentlyReviewed,
    };
  }, [
    featuredPool,
    hasClientFilters,
    isSearchMode,
    locationStep,
    popularCourses,
  ]);

  const showFeatured =
    featuredDiscovery !== null &&
    !popularLoading &&
    Object.values(featuredDiscovery).some((courses) => courses.length > 0);
  const showFlatResults = (isSearchMode || hasClientFilters || showLocationResults) && workingSet.length > 0;
  const showEmptyState =
    !loadError &&
    (isSearchMode || hasClientFilters
      ? !isLoading && !isPaging && workingSet.length === 0
      : shouldShowLocationEmptyState({
          workingSetLength: workingSet.length,
          isLoading,
          isPaging,
          showLocationResults,
        }));
  const showEmptyBrowse =
    !geoCountsLoading &&
    !isSearchMode &&
    !hasClientFilters &&
    locationStep === "countries" &&
    locationBrowseCountries.length === 0;

  return (
    <section className="et-courses" aria-labelledby="courses-heading">
      <div className="et-courses-intro">
        <header className="et-courses-header">
          <div className="et-courses-header-row">
            <div className="et-courses-header-copy">
              <p className="et-eyebrow et-eyebrow--line et-eyebrow--accent">The Course Edit</p>
              <h2 id="courses-heading" className="et-h2">
                The world’s great courses.
              </h2>
              <p className="et-body et-courses-lead">
                Member-reviewed clubs, memorable rounds, and destinations worth traveling for.
              </p>
            </div>
            <button
              type="button"
              className="et-btn et-btn--primary et-courses-add-btn"
              onClick={() => setShowAddCourseModal(true)}
            >
              {experienceCopy.shareTitle}
            </button>
          </div>
        </header>

        <CourseFiltersBar
          query={query}
          onQueryChange={setQuery}
          filters={filters}
          onFiltersChange={setFilters}
          filterOptions={filterOptions}
          sortBy={sortBy}
          onSortChange={setSortBy}
          onOpenMobileFilters={() => setFiltersOpen(true)}
        />
      </div>

      <CourseFilterDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        onFiltersChange={setFilters}
        filterOptions={filterOptions}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      <div className="et-courses-body">
        {loadError ? (
          <div className="et-alert et-alert--error" role="alert">
            <div>
              <p className="et-alert__title">Courses unavailable</p>
              <p className="et-alert__body">{loadError}</p>
            </div>
            <button
              type="button"
              className="et-btn et-btn--secondary et-btn--sm"
              onClick={() => void loadLocationPage(debouncedQuery, 0, locationState, locationStep)}
            >
              Retry
            </button>
          </div>
        ) : null}

        {isLoading && workingSet.length === 0 && (isSearchMode || showLocationResults) ? (
          <div className="et-loading et-courses-loading" aria-live="polite" aria-busy="true">
            <div className="et-loading__mark" aria-hidden="true" />
            <p className="et-loading__text">Loading course library</p>
          </div>
        ) : null}

        {showFeatured && featuredDiscovery ? (
          <CourseFeaturedSections
            categories={featuredDiscovery}
            onOpen={openCourse}
            bucketListCourseIdSet={bucketListCourseIdSet}
          />
        ) : null}

        {showLocationBrowse ? (
          <CourseLocationBrowse
            step={locationStep}
            countries={locationBrowseCountries}
            regions={locationBrowseRegions}
            selectedCountry={locationState.country}
            selectedRegion={locationState.region}
            regionCourseCount={regionCourseCount}
            onSelectCountry={(country) =>
              updateLocationState({ country, region: "", viewAll: false })
            }
            onSelectRegion={(region) =>
              updateLocationState({
                country: locationState.country,
                region,
                viewAll: false,
              })
            }
            onNavigateBreadcrumb={updateLocationState}
            onViewAllCourses={() =>
              updateLocationState({ country: "", region: "", viewAll: true })
            }
            onClearLocation={() =>
              updateLocationState({ country: "", region: "", viewAll: false })
            }
          />
        ) : null}

        {showFlatResults ? (
          <section aria-labelledby="course-search-results-heading">
            <div className="et-courses-directory-head">
              <h3 id="course-search-results-heading" className="et-h3">
                {isSearchMode
                  ? "Search results"
                  : hasClientFilters
                    ? "Filtered courses"
                    : locationStep === "all"
                      ? "All courses"
                      : `${locationState.region}, ${locationState.country}`}
              </h3>
              <p className="et-body-sm et-courses-directory-copy">
                {locationStep === "courses" && regionCourseCount > 0
                  ? `${regionCourseCount} ${regionCourseCount === 1 ? "course" : "courses"} in this region`
                  : `${workingSet.length} ${workingSet.length === 1 ? "course" : "courses"} shown`}
              </p>
            </div>
            <ul className="et-courses-grid">
              {workingSet.map((course) => (
                <li key={course.id}>
                  <CourseDirectoryCard
                    course={course}
                    onOpen={openCourse}
                    isOnBucketList={bucketListCourseIdSet.has(course.id)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {showEmptyState ? (
          <div className="et-courses-empty">
            <p className="et-courses-empty-title">No courses match this location yet</p>
            <p className="et-body-sm">
              Try another region, view all courses, or add a round manually.
            </p>
          </div>
        ) : null}

        {showEmptyBrowse ? (
          <div className="et-courses-empty">
            <p className="et-courses-empty-title">No courses are in the library yet</p>
            <p className="et-body-sm">Member rounds will begin populating the directory soon.</p>
          </div>
        ) : null}

        {showLocationResults && hasMore ? (
          <button
            type="button"
            className="et-btn et-btn--secondary et-courses-load-more"
            onClick={() => void loadMore()}
            onMouseDown={(event) => event.preventDefault()}
            onPointerDown={(event) => event.preventDefault()}
            disabled={isPaging}
            ref={loadMoreButtonRef}
          >
            {isPaging ? "Loading more courses…" : "Load more courses"}
          </button>
        ) : null}

      </div>

      {showAddCourseModal ? (
        <AddCoursePlayedModal
          onClose={() => setShowAddCourseModal(false)}
          onSubmitted={() => {
            setDirectoryRefreshKey((current) => current + 1);
            void loadPopular();
            void loadGeoCounts();
            void loadFeaturedSnapshot();
          }}
        />
      ) : null}
    </section>
  );
}
