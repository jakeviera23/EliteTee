import { useEffect, useRef, useState } from "react";
import { useDialogFocus } from "../../hooks/useDialogFocus";
import type { CourseListing } from "../../data/portalSocial";
import { earlyStageCopy, getPostsForCourse } from "../../data/portalSocial";
import { isCoursePlayed, togglePlayedCourse } from "../../lib/portalCourseState";
import { BucketListToggleButton } from "./BucketListToggleButton";
import { FeedPostCard } from "./FeedPostCard";
import { usePortalToast } from "./PortalToastProvider";

type CourseDetailModalProps = {
  course: CourseListing;
  onClose: () => void;
};

export function CourseDetailModal({ course, onClose }: CourseDetailModalProps) {
  const dialogRef = useRef<HTMLElement>(null);
  useDialogFocus({ dialogRef, onEscape: onClose });
  const { showToast } = usePortalToast();
  const [played, setPlayed] = useState(() => isCoursePlayed(course.id));
  const posts = getPostsForCourse(course.name);

  useEffect(() => {
    setPlayed(isCoursePlayed(course.id));
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

  return (
    <div className="portal-course-modal-backdrop" role="presentation" onClick={onClose}>
      <article
        ref={dialogRef}
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
          <img
            src={course.image}
            alt={course.imageAlt}
            loading="lazy"
            decoding="async"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
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

          <p className="portal-course-card-note">{earlyStageCopy.memberActivityGrowing}</p>

          <div className="portal-course-card-actions">
            <BucketListToggleButton courseId={course.id} />
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

        <section className="portal-course-modal-posts" aria-labelledby="course-modal-posts-heading">
          <h3 id="course-modal-posts-heading">Member Notes &amp; Rounds</h3>
          {posts.length > 0 ? (
            <div className="portal-feed-list portal-feed-list--compact">
              {posts.map((post) => (
                <FeedPostCard key={post.id} post={post} compact onToast={showToast} />
              ))}
            </div>
          ) : (
            <p className="portal-empty portal-empty--inline">{earlyStageCopy.memberActivityGrowing}</p>
          )}
        </section>
      </article>
    </div>
  );
}
