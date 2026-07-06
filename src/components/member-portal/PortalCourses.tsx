import { useEffect, useMemo, useState } from "react";
import { demoCourses, earlyStageCopy, getCourseById } from "../../data/portalSocial";
import { CourseDetailModal } from "./CourseDetailModal";
import { CourseGridCard } from "./CourseGridCard";

type PortalCoursesProps = {
  initialCourseId?: string | null;
  onCourseOpened?: () => void;
};

export function PortalCourses({ initialCourseId = null, onCourseOpened }: PortalCoursesProps) {
  const [detailCourseId, setDetailCourseId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (initialCourseId) {
      setDetailCourseId(initialCourseId);
      onCourseOpened?.();
    }
  }, [initialCourseId, onCourseOpened]);

  const detailCourse = detailCourseId ? getCourseById(detailCourseId) : null;

  const filteredCourses = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return demoCourses;

    return demoCourses.filter((course) =>
      [course.name, course.location, course.description].join(" ").toLowerCase().includes(normalized),
    );
  }, [query]);

  return (
    <section className="portal-courses-page" aria-labelledby="courses-heading">
      <header className="portal-courses-header">
        <h2 id="courses-heading">Courses</h2>
        <p>{earlyStageCopy.courseDiscoveryPreview}. {earlyStageCopy.coursesGrowNote}</p>
        <p className="portal-early-badge">{earlyStageCopy.earlyCommunity}</p>
      </header>

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

      {filteredCourses.length > 0 ? (
        <ul className="portal-courses-grid">
          {filteredCourses.map((course) => (
            <li key={course.id}>
              <CourseGridCard course={course} onView={() => setDetailCourseId(course.id)} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="portal-empty portal-empty--inline">No courses match your search.</p>
      )}

      {detailCourse ? (
        <CourseDetailModal course={detailCourse} onClose={() => setDetailCourseId(null)} />
      ) : null}
    </section>
  );
}
