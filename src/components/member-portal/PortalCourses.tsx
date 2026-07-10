import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { earlyStageCopy } from "../../data/portalSocial";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import {
  fetchPopularGolfCourses,
  searchGolfCourses,
  SEARCH_PAGE_SIZE,
} from "../../lib/golfCourses";
import { fetchMemberCourseRounds } from "../../lib/memberCourseRounds";
import type { GolfCourseSearchResult } from "../../types/golfCourse";
import type { MemberCourseRoundRecord } from "../../types/memberCourseRound";
import { AddCoursePlayedModal } from "./AddCoursePlayedModal";
import { CourseSearchCard } from "./CourseSearchCard";
import { MemberActivityList } from "./MemberActivityList";

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
  const [memberRounds, setMemberRounds] = useState<MemberCourseRoundRecord[]>([]);
  const [roundsLoading, setRoundsLoading] = useState(true);
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);

  const loadMemberRounds = useCallback(async () => {
    setRoundsLoading(true);
    const { data, error } = await fetchMemberCourseRounds(12);
    if (!error && data) {
      setMemberRounds(data);
    } else {
      setMemberRounds([]);
    }
    setRoundsLoading(false);
  }, []);

  const loadPopular = useCallback(async () => {
    const { data } = await fetchPopularGolfCourses(6);
    setPopularCourses(data ?? []);
  }, []);

  useEffect(() => {
    void loadMemberRounds();
    void loadPopular();
  }, [loadMemberRounds, loadPopular]);

  useEffect(() => {
    let active = true;

    async function runSearch() {
      setIsSearching(true);
      setSearchError(null);
      setOffset(0);

      const { data, error } = await searchGolfCourses({
        query: debouncedQuery,
        limit: SEARCH_PAGE_SIZE,
        offset: 0,
      });

      if (!active) return;

      if (error) {
        console.error("[PortalCourses] search failed", error.message);
        setSearchError("Course search is unavailable right now.");
        setResults([]);
        setHasMore(false);
      } else {
        const rows = data ?? [];
        setResults(rows);
        setHasMore(rows.length === SEARCH_PAGE_SIZE);
      }

      setIsSearching(false);
    }

    void runSearch();

    return () => {
      active = false;
    };
  }, [debouncedQuery]);

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

  const showPopular = debouncedQuery.trim() === "" && popularCourses.length > 0;
  const showInitialState = debouncedQuery.trim() === "" && results.length === 0 && !isSearching;

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

      <div className="courses-layout courses-layout--library">
        <div className="courses-main">
          {searchError ? (
            <p className="portal-alert portal-alert--warning" role="alert">
              {searchError}
            </p>
          ) : null}

          {isSearching ? (
            <p className="portal-discover-loading">Searching courses…</p>
          ) : null}

          {!isSearching && results.length > 0 ? (
            <section aria-labelledby="course-search-results-heading">
              <h3 id="course-search-results-heading" className="portal-courses-section-label">
                {debouncedQuery.trim() ? "Search Results" : "Course Directory"}
              </h3>
              <ul className="golf-course-search-list">
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

          {showInitialState ? (
            <p className="courses-no-match">
              Start typing to search the course library, or browse popular courses below.
            </p>
          ) : null}

          {showPopular ? (
            <section className="golf-course-popular" aria-labelledby="popular-courses-heading">
              <h3 id="popular-courses-heading" className="portal-courses-section-label">
                Popular in EliteTee
              </h3>
              <p className="portal-courses-featured-note">
                Ranked by real member rounds and recommendations.
              </p>
              <ul className="golf-course-search-list">
                {popularCourses.map((course) => (
                  <li key={`popular-${course.id}`}>
                    <CourseSearchCard course={course} onOpen={openCourse} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="golf-course-recent" aria-labelledby="recently-played-heading">
            <h3 id="recently-played-heading" className="portal-courses-section-label">
              Recently Played
            </h3>
            {roundsLoading ? (
              <p className="portal-discover-loading">Loading recent rounds…</p>
            ) : (
              <MemberActivityList
                rounds={memberRounds.slice(0, 6)}
                emptyMessage={earlyStageCopy.memberActivityPending}
                allowPhotoDelete
                onRoundsChanged={() => void loadMemberRounds()}
              />
            )}
          </section>
        </div>

        <aside className="courses-signals" aria-labelledby="course-signals-heading">
          <div className="courses-signals-panel courses-signals-panel--early">
            <h3 id="course-signals-heading" className="courses-signals-title">
              Member Activity
            </h3>
            {roundsLoading ? (
              <p className="courses-signals-early-copy">Loading member rounds…</p>
            ) : (
              <MemberActivityList
                rounds={memberRounds}
                emptyMessage={earlyStageCopy.coursesLibraryGrowth}
                allowPhotoDelete
                onRoundsChanged={() => void loadMemberRounds()}
              />
            )}
          </div>
        </aside>
      </div>

      {showAddCourseModal ? (
        <AddCoursePlayedModal
          onClose={() => setShowAddCourseModal(false)}
          onSubmitted={() => {
            void loadMemberRounds();
            void loadPopular();
          }}
        />
      ) : null}
    </section>
  );
}
