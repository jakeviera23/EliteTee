import { useEffect, useState } from "react";
import type { CourseListing } from "../../data/portalSocial";
import { earlyStageCopy, getPostsForCourse } from "../../data/portalSocial";
import {
  isCourseOnBucketList,
  isCoursePlayed,
  toggleBucketListCourse,
  togglePlayedCourse,
} from "../../lib/portalCourseState";
import { CourseImage } from "./CourseImage";
import { FeedPostCard } from "./FeedPostCard";
import { usePortalToast } from "./PortalToastProvider";

type CourseDetailModalProps = {
  course: CourseListing;
  onClose: () => void;
};

export function CourseDetailModal({ course, onClose }: CourseDetailModalProps) {
  const { showToast } = usePortalToast();
  const [played, setPlayed] = useState(() => isCoursePlayed(course.id));
  const [bucketListed, setBucketListed] = useState(() => isCourseOnBucketList(course.id));
  const posts = getPostsForCourse(course.name);

  useEffect(() => {
    setPlayed(isCoursePlayed(course.id));
    setBucketListed(isCourseOnBucketList(course.id));
  }, [course.id]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

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
    <div className="portal-course-modal-backdrop" role="presentation" onClick={onClose}>
      <article
        className="portal-course-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="course-modal-heading"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="portal-course-modal-head">
          <h2 id="course-modal-heading">Course Details</h2>
          <button type="button" className="portal-course-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="portal-course-modal-hero">
          <CourseImage src={course.image} alt={course.imageAlt} fill />
          <span className="portal-course-card-badge">{earlyStageCopy.featuredCourseLabel}</span>
        </div>

        <div className="portal-course-modal-body">
          <h3 className="portal-course-modal-title">{course.name}</h3>
          <p className="portal-course-card-location">{course.location}</p>
          <p className="portal-course-modal-description">{course.description}</p>

          <p className="portal-course-card-meta">
            <span>Best months</span>
            <strong>{course.bestMonths}</strong>
          </p>

          <p className="portal-course-card-note">{earlyStageCopy.coursesGrowNote}</p>

          <div className="portal-course-card-actions">
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

        <section className="portal-course-modal-posts" aria-labelledby="course-modal-posts-heading">
          <h3 id="course-modal-posts-heading">Member Posts</h3>
          {posts.length > 0 ? (
            <div className="portal-feed-list portal-feed-list--compact">
              {posts.map((post) => (
                <FeedPostCard key={post.id} post={post} compact onToast={showToast} />
              ))}
            </div>
          ) : (
            <p className="portal-empty portal-empty--inline">{earlyStageCopy.memberActivityPending}</p>
          )}
        </section>
      </article>
    </div>
  );
}
