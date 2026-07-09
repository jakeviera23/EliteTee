import { useEffect, useMemo, useState } from "react";
import { demoCourses, earlyStageCopy, getCourseById } from "../../data/portalSocial";
import {
  getBucketListCourseIds,
  getPlayedCourseIds,
} from "../../lib/portalCourseState";
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
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("All Courses");
  const [statusVersion, setStatusVersion] = useState(0);

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
        <h2 id="courses-heading">Courses</h2>
        <p>
          Explore the course library. Member rounds, recommendations, and travel notes will appear as
          founding members share activity.
        </p>
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
          <div className="courses-signals-panel courses-signals-panel--early">
            <h3 id="course-signals-heading" className="courses-signals-title">
              Member Activity
            </h3>
            <p className="courses-signals-early-copy">{earlyStageCopy.memberActivityPending}</p>
            <p className="courses-signals-early-note">{earlyStageCopy.memberActivityGrowing}</p>
          </div>
        </aside>
      </div>

      {detailCourse ? (
        <CourseDetailModal course={detailCourse} onClose={() => setDetailCourseId(null)} />
      ) : null}
    </section>
  );
}
