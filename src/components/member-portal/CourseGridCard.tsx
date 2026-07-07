import { useState } from "react";
import type { CourseListing } from "../../data/portalSocial";
import {
  isCourseOnBucketList,
  isCoursePlayed,
  toggleBucketListCourse,
  togglePlayedCourse,
} from "../../lib/portalCourseState";
import { CourseImage } from "./CourseImage";
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
        <CourseImage src={course.image} alt={course.imageAlt} objectPosition="center" fill />
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

        <dl className="portal-course-card-stats">
          <div>
            <dt>Members played</dt>
            <dd>{course.membersPlayed}</dd>
          </div>
          <div>
            <dt>Want to play</dt>
            <dd>{course.membersWantToPlay}</dd>
          </div>
        </dl>

        <p className="portal-course-card-activity">{course.recentActivity}</p>

        <div className="portal-course-card-actions">
          <button type="button" className="portal-btn portal-btn--gold" onClick={onView}>
            View Course
          </button>
          <button
            type="button"
            className={`portal-btn portal-btn--outline${played ? " is-active" : ""}`}
            onClick={handlePlayed}
            aria-pressed={played}
          >
            {played ? "Played ✓" : "Played"}
          </button>
          <button
            type="button"
            className={`portal-btn portal-btn--outline${bucketListed ? " is-active" : ""}`}
            onClick={handleBucketList}
            aria-pressed={bucketListed}
          >
            {bucketListed ? "Added ✓" : "Add to List"}
          </button>
        </div>
      </div>
    </article>
  );
}
