import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import {
  fetchPopularGolfCourses,
  searchGolfCourses,
  SEARCH_PAGE_SIZE,
} from "../../lib/golfCourses";
import type { GolfCourseSearchResult } from "../../types/golfCourse";
import { AddCoursePlayedModal } from "./AddCoursePlayedModal";
import { CourseCompactCard } from "./CourseCompactCard";
import { CourseSearchCard } from "./CourseSearchCard";

const POPULAR_COURSE_LIMIT = 5;

export function PortalCourses() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [results, setResults] = useState<GolfCourseSearchResult[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isSearching, setIsSearching] = useState(true);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [popularCourses, setPopularCourses] = useState<GolfCourseSearchResult[]>([]);
  const [popularLoading, setPopularLoading] = useState(true);
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [directoryRefreshKey, setDirectoryRefreshKey] = useState(0);

  const loadPopular = useCallback(async () => {
    setPopularLoading(true);
    const { data } = await fetchPopularGolfCourses(POPULAR_COURSE_LIMIT);
    setPopularCourses(data ?? []);
    setPopularLoading(false);
  }, []);

  const loadDirectory = useCallback(async (searchQuery: string, searchOffset: number) => {
    setIsSearching(true);
    setSearchError(null);

    const { data, error } = await searchGolfCourses({
      query: searchQuery,
      limit: SEARCH_PAGE_SIZE,
      offset: searchOffset,
    });

    if (error) {
      console.error("[PortalCourses] directory load failed", error.message);
      setSearchError("Course search is unavailable right now.");
      setResults([]);
      setHasMore(false);
      setIsSearching(false);
      return;
    }

    const rows = data ?? [];
    if (searchOffset === 0) {
      setResults(rows);
    } else {
      setResults((current) => [...current, ...rows]);
    }
    setOffset(searchOffset);
    setHasMore(rows.length === SEARCH_PAGE_SIZE);
    setIsSearching(false);
  }, []);

  useEffect(() => {
    void loadPopular();
  }, [loadPopular]);

  useEffect(() => {
    void loadDirectory(debouncedQuery, 0);
  }, [debouncedQuery, directoryRefreshKey, loadDirectory]);

  async function loadMore() {
    const nextOffset = offset + SEARCH_PAGE_SIZE;
    const { data, error } = await searchGolfCourses({
      query: debouncedQuery,
      limit: SEARCH_PAGE_SIZE,
      offset: nextOffset,
    });

    if (error || !data) return;

    setResults((current) => [...current, ...data]);
    setOffset(nextOffset);
    setHasMore(data.length === SEARCH_PAGE_SIZE);
  }

  function openCourse(slug: string) {
    navigate(`/courses/${slug}`);
  }

  const showPopularSection = debouncedQuery.trim() === "";
  const showEmptyDirectory =
    debouncedQuery.trim() === "" && results.length === 0 && !isSearching && !searchError;

  return (
    <section className="portal-courses-page portal-courses-page--library" aria-labelledby="courses-heading">
      <header className="portal-courses-header portal-courses-header--search">
        <div className="portal-courses-header-row">
          <div>
            <p className="portal-courses-eyebrow">Course Library</p>
            <h2 id="courses-heading">Courses</h2>
            <p>Search private clubs, destinations, and member-played courses across EliteTee.</p>
          </div>
          <button
            type="button"
            className="portal-btn portal-btn--gold portal-courses-add-btn"
            onClick={() => setShowAddCourseModal(true)}
          >
            Add Course Played
          </button>
        </div>

        <label className="portal-courses-search portal-courses-search--hero">
          <span className="visually-hidden">Search courses</span>
          <input
            type="search"
            className="portal-courses-search-input portal-courses-search-input--hero"
            placeholder="Search by course name, city, region, or country…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
          />
        </label>
      </header>

      <div className="courses-directory">
        {searchError ? (
          <p className="portal-alert portal-alert--warning" role="alert">
            {searchError}
          </p>
        ) : null}

        {isSearching ? (
          <p className="portal-discover-loading">Loading courses…</p>
        ) : null}

        {!isSearching && results.length > 0 ? (
          <section aria-labelledby="course-search-results-heading">
            <h3 id="course-search-results-heading" className="portal-courses-section-label">
              {debouncedQuery.trim() ? "Search Results" : "Course Directory"}
            </h3>
            <ul className="golf-course-search-list golf-course-search-list--directory">
              {results.map((course) => (
                <li key={course.id}>
                  <CourseSearchCard course={course} onOpen={openCourse} />
                </li>
              ))}
            </ul>
            {hasMore ? (
              <button
                type="button"
                className="portal-btn portal-btn--outline golf-course-load-more"
                onClick={() => void loadMore()}
              >
                Load more courses
              </button>
            ) : null}
          </section>
        ) : null}

        {!isSearching && !searchError && results.length === 0 && debouncedQuery.trim() ? (
          <p className="courses-no-match">
            No courses match that search. Try a different name or location, or add a round manually.
          </p>
        ) : null}

        {showEmptyDirectory ? (
          <p className="courses-no-match">No courses are in the library yet.</p>
        ) : null}

        {showPopularSection ? (
          <section className="golf-course-popular" aria-labelledby="popular-courses-heading">
            <h3 id="popular-courses-heading" className="portal-courses-section-label">
              Popular in EliteTee
            </h3>
            <p className="portal-courses-featured-note">
              Top courses ranked by real member rounds and recommendations.
            </p>
            {popularLoading ? (
              <p className="portal-discover-loading portal-discover-loading--compact">Loading popular courses…</p>
            ) : popularCourses.length > 0 ? (
              <ul className="golf-course-compact-list">
                {popularCourses.map((course) => (
                  <li key={`popular-${course.id}`}>
                    <CourseCompactCard course={course} onOpen={openCourse} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="golf-course-popular-empty">
                Member rounds will appear here as more courses are played and shared.
              </p>
            )}
          </section>
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
