import { useState } from "react";
import type { CourseListing } from "../../data/portalSocial";
import { earlyStageCopy } from "../../data/portalSocial";
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
};

export function CourseGridCard({ course, onView }: CourseGridCardProps) {
  const { showToast } = usePortalToast();
  const [played, setPlayed] = useState(() => isCoursePlayed(course.id));
  const [bucketListed, setBucketListed] = useState(() => isCourseOnBucketList(course.id));

  function handlePlayed() {
    const next = togglePlayedCourse(course.id);
    setPlayed(next);
    showToast(next ? "Added to played courses" : "Removed from played courses");
  }

  function handleBucketList() {
    const next = toggleBucketListCourse(course.id);
    setBucketListed(next);
    showToast(next ? "Course saved to your list" : "Removed from your list");
  }

  return (
    <article className="portal-course-card">
      <div className="portal-course-card-hero">
        <CourseImage src={course.image} alt={course.imageAlt} objectPosition="center" fill />
        <span className="portal-course-card-badge">{earlyStageCopy.featuredCourseLabel}</span>
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

        <p className="portal-course-card-note">{earlyStageCopy.courseMemberPhotosNote}</p>

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
            {played ? "Added" : "Played"}
          </button>
          <button
            type="button"
            className={`portal-btn portal-btn--outline${bucketListed ? " is-active" : ""}`}
            onClick={handleBucketList}
            aria-pressed={bucketListed}
          >
            {bucketListed ? "Saved" : "Add Course to List"}
          </button>
        </div>
      </div>
    </article>
  );
}
