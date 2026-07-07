import { useEffect, useMemo, useState } from "react";
import { demoCourses, getCourseById } from "../../data/portalSocial";
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

const courseSignals = {
  trending: ["St Andrews", "Bandon Dunes", "Hamptons private clubs"],
  travelMonths: [
    { place: "Scotland", when: "July – September" },
    { place: "Hamptons", when: "June – August" },
    { place: "Palm Beach", when: "December – March" },
  ],
  mostSaved: ["Cypress Point", "Pine Valley", "National Golf Links"],
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
          Discover courses through member rounds, saved lists, travel plans, and trusted
          recommendations.
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
          <div className="courses-signals-panel">
            <h3 id="course-signals-heading" className="courses-signals-title">
              Course Signals
            </h3>

            <section aria-labelledby="trending-heading">
              <h4 id="trending-heading" className="courses-signals-label">
                Trending now
              </h4>
              <ul className="courses-signals-list">
                {courseSignals.trending.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="travel-months-heading">
              <h4 id="travel-months-heading" className="courses-signals-label">
                Popular travel months
              </h4>
              <ul className="courses-signals-travel">
                {courseSignals.travelMonths.map((item) => (
                  <li key={item.place}>
                    <span>{item.place}</span>
                    <span>{item.when}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="most-saved-heading">
              <h4 id="most-saved-heading" className="courses-signals-label">
                Most saved
              </h4>
              <ul className="courses-signals-list">
                {courseSignals.mostSaved.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          </div>
        </aside>
      </div>

      {detailCourse ? (
        <CourseDetailModal course={detailCourse} onClose={() => setDetailCourseId(null)} />
      ) : null}
    </section>
  );
}
