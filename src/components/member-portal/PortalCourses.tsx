import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { experienceCopy } from "../../data/portalSocial";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import {
  buildFeaturedSections,
  countActiveFilters,
  DEFAULT_COURSE_FILTERS,
  extractFilterOptions,
  filterCourses,
  groupCoursesGeographically,
  sortCourses,
  type CourseDirectoryFilters,
  type CourseSortOption,
} from "../../lib/courseDirectory";
import {
  fetchPopularGolfCourses,
  searchGolfCourses,
  SEARCH_PAGE_SIZE,
} from "../../lib/golfCourses";
import { appendUniqueCourses } from "../../lib/courseResultsAppend";
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
import { CourseGeoDirectory } from "./CourseGeoDirectory";

const POPULAR_COURSE_LIMIT = 5;

export function PortalCourses() {
  const navigate = useNavigate();
  const loadMoreButtonRef = useRef<HTMLButtonElement | null>(null);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [directoryPool, setDirectoryPool] = useState<GolfCourseSearchResult[]>([]);
  const [searchResults, setSearchResults] = useState<GolfCourseSearchResult[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaging, setIsPaging] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [popularCourses, setPopularCourses] = useState<GolfCourseSearchResult[]>([]);
  const [popularLoading, setPopularLoading] = useState(true);
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

  const loadPopular = useCallback(async () => {
    setPopularLoading(true);
    const { data } = await fetchPopularGolfCourses(POPULAR_COURSE_LIMIT);
    setPopularCourses(data ?? []);
    setPopularLoading(false);
  }, []);

  const loadDirectoryPage = useCallback(async (searchQuery: string, searchOffset: number) => {
    if (searchOffset === 0) {
      setIsLoading(true);
    } else {
      setIsPaging(true);
    }
    setLoadError(null);

    const { data, error } = await searchGolfCourses({
      query: searchQuery,
      limit: SEARCH_PAGE_SIZE,
      offset: searchOffset,
    });

    if (error) {
      console.error("[PortalCourses] directory load failed", error.message);
      setLoadError("Course search is unavailable right now.");
      if (searchOffset === 0) {
        setDirectoryPool([]);
        setSearchResults([]);
      }
      setHasMore(false);
      setIsLoading(false);
      setIsPaging(false);
      return;
    }

    const rows = data ?? [];
    const searching = searchQuery.trim().length > 0;

    if (searching) {
      if (searchOffset === 0) {
        setSearchResults(rows);
      } else {
        setSearchResults((current) => appendUniqueCourses(current, rows));
      }
    } else if (searchOffset === 0) {
      setDirectoryPool(rows);
    } else {
      setDirectoryPool((current) => appendUniqueCourses(current, rows));
    }

    setOffset(searchOffset);
    setHasMore(rows.length === SEARCH_PAGE_SIZE);
    setIsLoading(false);
    setIsPaging(false);
  }, []);

  useEffect(() => {
    void loadPopular();
  }, [loadPopular]);

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
    void loadDirectoryPage(debouncedQuery, 0);
  }, [debouncedQuery, directoryRefreshKey, loadDirectoryPage]);

  async function loadMore() {
    const nextOffset = offset + SEARCH_PAGE_SIZE;
    await loadDirectoryPage(debouncedQuery, nextOffset);
  }

  function openCourse(slug: string) {
    navigate(`/courses/${slug}`);
  }

  const bucketListCourseIdSet = useMemo(() => new Set(bucketListCourseIds), [bucketListCourseIds]);

  const workingSet = useMemo(() => {
    const base = isSearchMode ? searchResults : directoryPool;
    const filtered = hasClientFilters ? filterCourses(base, filters) : base;
    return sortCourses(filtered, sortBy);
  }, [directoryPool, filters, hasClientFilters, isSearchMode, searchResults, sortBy]);

  const filterOptions = useMemo(
    () => extractFilterOptions(isSearchMode ? searchResults : directoryPool, filters),
    [directoryPool, filters, isSearchMode, searchResults],
  );

  const geoGroups = useMemo(
    () => (isSearchMode || hasClientFilters ? [] : groupCoursesGeographically(workingSet)),
    [hasClientFilters, isSearchMode, workingSet],
  );

  const featuredSections = useMemo(() => {
    if (isSearchMode || hasClientFilters) return [];

    const featured = buildFeaturedSections({
      popular: popularCourses,
      pool: directoryPool,
      limit: POPULAR_COURSE_LIMIT,
    });

    return [
      {
        id: "popular",
        title: "Popular in EliteTee",
        description: "Courses with the most member rounds and activity.",
        courses: featured.popular,
      },
      {
        id: "highest-rated",
        title: "Highest Rated",
        description: "Top-rated destinations based on member reviews.",
        courses: featured.highestRated,
      },
      {
        id: "recently-reviewed",
        title: "Recently Reviewed",
        description: "Courses with the latest member round activity.",
        courses: featured.recentlyReviewed,
      },
    ];
  }, [directoryPool, hasClientFilters, isSearchMode, popularCourses]);

  const showFeatured = !isSearchMode && !hasClientFilters && !popularLoading;
  const showGeoDirectory = !isSearchMode && !hasClientFilters && workingSet.length > 0;
  const showFlatResults = (isSearchMode || hasClientFilters) && workingSet.length > 0;
  const showEmptyState =
    !isLoading && !loadError && workingSet.length === 0 && (isSearchMode || hasClientFilters);
  const showEmptyDirectory =
    !isLoading && !loadError && directoryPool.length === 0 && !isSearchMode && !hasClientFilters;

  return (
    <section className="et-courses" aria-labelledby="courses-heading">
      <header className="et-courses-header">
        <div className="et-courses-header-row">
          <div className="et-courses-header-copy">
            <p className="et-eyebrow et-eyebrow--line et-eyebrow--accent">Course Library</p>
            <h2 id="courses-heading" className="et-h2">
              Courses
            </h2>
            <p className="et-body et-courses-lead">
              Browse private clubs, destinations, and member-played courses across EliteTee.
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
          </div>
        ) : null}

        {isLoading && workingSet.length === 0 ? (
          <div className="et-loading et-courses-loading" aria-live="polite" aria-busy="true">
            <div className="et-loading__mark" aria-hidden="true" />
            <p className="et-loading__text">Loading course library</p>
          </div>
        ) : null}

        {showFeatured ? (
          <CourseFeaturedSections
            sections={featuredSections}
            onOpen={openCourse}
            bucketListCourseIdSet={bucketListCourseIdSet}
          />
        ) : null}

        {showGeoDirectory ? (
          <section className="et-courses-directory" aria-labelledby="course-directory-heading">
            <div className="et-courses-directory-head">
              <h3 id="course-directory-heading" className="et-h3">
                Browse by destination
              </h3>
              <p className="et-body-sm et-courses-directory-copy">
                Courses grouped by country and region from member and library data.
              </p>
            </div>
            <CourseGeoDirectory
              groups={geoGroups}
              onOpen={openCourse}
              bucketListCourseIdSet={bucketListCourseIdSet}
            />
          </section>
        ) : null}

        {showFlatResults ? (
          <section aria-labelledby="course-search-results-heading">
            <div className="et-courses-directory-head">
              <h3 id="course-search-results-heading" className="et-h3">
                {isSearchMode ? "Search results" : "Filtered courses"}
              </h3>
              <p className="et-body-sm et-courses-directory-copy">
                {workingSet.length} {workingSet.length === 1 ? "course" : "courses"} found
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
            <p className="et-courses-empty-title">No courses match your search or filters</p>
            <p className="et-body-sm">
              Try a different name or location, or add a round manually.
            </p>
          </div>
        ) : null}

        {showEmptyDirectory ? (
          <div className="et-courses-empty">
            <p className="et-courses-empty-title">No courses are in the library yet</p>
            <p className="et-body-sm">Member rounds will begin populating the directory soon.</p>
          </div>
        ) : null}

        {hasMore ? (
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
          }}
        />
      ) : null}
    </section>
  );
}
