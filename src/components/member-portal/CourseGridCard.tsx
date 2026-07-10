import { useState } from "react";
import type { CourseListing } from "../../data/portalSocial";
import {
  isCourseOnBucketList,
  isCoursePlayed,
  toggleBucketListCourse,
  togglePlayedCourse,
} from "../../lib/portalCourseState";
import { usePortalToast } from "./PortalToastProvider";

type CourseGridCardProps = {
  course: CourseListing;
  onView: () => void;
  onStatusChange?: () => void;
};

export function CourseGridCard({ course, onView, onStatusChange }: CourseGridCardProps) {
  const { showToast } = usePortalToast();
  const [played, setPlayed] = useState(() => isCoursePlayed(course.id));
  const [bucketListed, setBucketListed] = useState(() => isCourseOnBucketList(course.id));

  function handlePlayed() {
    const next = togglePlayedCourse(course.id);
    setPlayed(next);
    showToast(next ? "Marked as played" : "Removed from played courses");
    onStatusChange?.();
  }

  function handleBucketList() {
    const next = toggleBucketListCourse(course.id);
    setBucketListed(next);
    showToast(next ? "Added to your list" : "Removed from your list");
    onStatusChange?.();
  }

  return (
    <article className="portal-course-card">
      <div className="portal-course-card-hero">
        <img
          src={course.image}
          alt={course.imageAlt}
          loading="lazy"
          decoding="async"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>

      <div className="portal-course-card-content">
        <header className="portal-course-card-header">
          <h3 className="portal-course-card-title">{course.name}</h3>
          <p className="portal-course-card-location">{course.location}</p>
        </header>

        <p className="portal-course-card-description">{course.description}</p>

        <p className="portal-course-card-meta">
          <span>Best months</span>
          <strong>{course.bestMonths}</strong>
        </p>

        <div className="portal-course-card-actions">
          <button type="button" className="portal-btn portal-btn--gold" onClick={onView}>
            View Course
          </button>
          <button
            type="button"
            className={`portal-btn portal-btn--outline${bucketListed ? " is-active" : ""}`}
            onClick={handleBucketList}
            aria-pressed={bucketListed}
          >
            {bucketListed ? "Saved ✓" : "Save"}
          </button>
          <button
            type="button"
            className={`portal-btn portal-btn--outline${played ? " is-active" : ""}`}
            onClick={handlePlayed}
            aria-pressed={played}
          >
            {played ? "Played ✓" : "Played"}
          </button>
        </div>
      </div>
    </article>
  );
}
