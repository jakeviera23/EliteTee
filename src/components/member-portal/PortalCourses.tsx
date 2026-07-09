import { useCallback, useEffect, useMemo, useState } from "react";
import { demoCourses, earlyStageCopy, getCourseById } from "../../data/portalSocial";
import {
  fetchMemberCourseRounds,
  formatPlayedOnDate,
} from "../../lib/memberCourseRounds";
import {
  getBucketListCourseIds,
  getPlayedCourseIds,
} from "../../lib/portalCourseState";
import type { MemberCourseRoundRecord } from "../../types/memberCourseRound";
import { AddCoursePlayedModal } from "./AddCoursePlayedModal";
import { CourseDetailModal } from "./CourseDetailModal";
import { CourseGridCard } from "./CourseGridCard";

const courseFilters = [
  "All Courses",
  "Private Clubs",
  "Links",
  "Coastal",
  "Bucket List",
  "Recently Played",
  "Saved",
  "Traveling Soon",
] as const;

const filterTagMap: Record<string, string> = {
  "Private Clubs": "private",
  Links: "links",
  Coastal: "coastal",
  "Bucket List": "bucket-list",
  "Traveling Soon": "traveling-soon",
};

type PortalCoursesProps = {
  initialCourseId?: string | null;
  onCourseOpened?: () => void;
};

export function PortalCourses({ initialCourseId = null, onCourseOpened }: PortalCoursesProps) {
  const [detailCourseId, setDetailCourseId] = useState<string | null>(null);
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("All Courses");
  const [statusVersion, setStatusVersion] = useState(0);
  const [memberRounds, setMemberRounds] = useState<MemberCourseRoundRecord[]>([]);
  const [roundsLoading, setRoundsLoading] = useState(true);

  const loadMemberRounds = useCallback(async () => {
    setRoundsLoading(true);
    const { data, error } = await fetchMemberCourseRounds();
    if (!error && data) {
      setMemberRounds(data);
    } else {
      setMemberRounds([]);
    }
    setRoundsLoading(false);
  }, []);

  useEffect(() => {
    void loadMemberRounds();
  }, [loadMemberRounds]);

  useEffect(() => {
    if (initialCourseId) {
      setDetailCourseId(initialCourseId);
      onCourseOpened?.();
    }
  }, [initialCourseId, onCourseOpened]);

  const detailCourse = detailCourseId ? getCourseById(detailCourseId) : null;

  const filteredCourses = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const playedIds = getPlayedCourseIds();
    const savedIds = getBucketListCourseIds();
    const tag = filterTagMap[activeFilter];

    return demoCourses.filter((course) => {
      const haystack = [course.name, course.location, course.description].join(" ").toLowerCase();
      const matchesQuery = normalized === "" || haystack.includes(normalized);

      let matchesFilter = true;
      if (activeFilter === "Recently Played") {
        matchesFilter = playedIds.includes(course.id);
      } else if (activeFilter === "Saved") {
        matchesFilter = savedIds.includes(course.id);
      } else if (tag) {
        matchesFilter = course.tags.includes(tag);
      }

      return matchesQuery && matchesFilter;
    });
  }, [query, activeFilter, statusVersion]);

  return (
    <section className="portal-courses-page" aria-labelledby="courses-heading">
      <header className="portal-courses-header">
        <p className="portal-courses-eyebrow">{earlyStageCopy.curatedLibraryLabel}</p>
        <div className="portal-courses-header-row">
          <div>
            <h2 id="courses-heading">Courses</h2>
            <p>{earlyStageCopy.coursesIntro}</p>
          </div>
          <button
            type="button"
            className="portal-btn portal-btn--gold portal-courses-add-btn"
            onClick={() => setShowAddCourseModal(true)}
          >
            Add Course Played
          </button>
        </div>
      </header>

      <div className="courses-toolbar">
        <label className="portal-courses-search">
          <span className="visually-hidden">Search courses</span>
          <input
            type="search"
            className="portal-courses-search-input"
            placeholder="Search by course name or location…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="courses-filters" role="group" aria-label="Filter courses">
          {courseFilters.map((filter) => (
            <button
              key={filter}
              type="button"
              className={`courses-chip${activeFilter === filter ? " is-active" : ""}`}
              aria-pressed={activeFilter === filter}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="courses-layout">
        <div className="courses-main">
          <p className="portal-courses-section-label">Featured Courses</p>
          <p className="portal-courses-featured-note">{earlyStageCopy.featuredCoursesStartingPoint}</p>
          {filteredCourses.length > 0 ? (
            <ul className="portal-courses-grid">
              {filteredCourses.map((course) => (
                <li key={course.id}>
                  <CourseGridCard
                    course={course}
                    onView={() => setDetailCourseId(course.id)}
                    onStatusChange={() => setStatusVersion((version) => version + 1)}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="courses-no-match">
              No courses match that search or filter. Try a different name, location, or category.
            </p>
          )}
        </div>

        <aside className="courses-signals" aria-labelledby="course-signals-heading">
          <div className="courses-signals-panel courses-signals-panel--early courses-empty-state">
            <h3 id="course-signals-heading" className="courses-signals-title">
              Member Activity
            </h3>

            {roundsLoading ? (
              <p className="courses-signals-early-copy">Loading member rounds…</p>
            ) : memberRounds.length > 0 ? (
              <ul className="courses-activity-list">
                {memberRounds.map((round) => (
                  <li key={round.id} className="courses-activity-item">
                    <p className="courses-activity-name">{round.course_name}</p>
                    <p className="courses-activity-meta">
                      {round.location} · {formatPlayedOnDate(round.played_on)}
                    </p>
                    {round.note.trim() ? (
                      <p className="courses-activity-note">{round.note}</p>
                    ) : null}
                    <p className="courses-activity-again">
                      Would play again: {round.would_play_again ? "Yes" : "No"}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="courses-signals-early-copy">{earlyStageCopy.coursesLibraryGrowth}</p>
            )}
          </div>
        </aside>
      </div>

      {detailCourse ? (
        <CourseDetailModal course={detailCourse} onClose={() => setDetailCourseId(null)} />
      ) : null}

      {showAddCourseModal ? (
        <AddCoursePlayedModal
          onClose={() => setShowAddCourseModal(false)}
          onSubmitted={() => {
            void loadMemberRounds();
          }}
        />
      ) : null}
    </section>
  );
}
