import {
  COMMUNITY_ADDED_COURSE_LABEL,
  shouldShowCommunityAddedBadge,
  type GolfCourseSearchResult,
} from "../../types/golfCourse";
import {
  buildCourseCardActivitySummary,
  buildCourseClassificationPills,
  formatCourseDisplayLocation,
} from "../../lib/courseDisplay";
import { formatCourseRatingDisplay } from "../../lib/courseRating";
import { CourseImage } from "./CourseImage";

type CourseDirectoryCardProps = {
  course: GolfCourseSearchResult;
  onOpen: (slug: string) => void;
  isOnBucketList?: boolean;
};

export function CourseDirectoryCard({ course, onOpen, isOnBucketList = false }: CourseDirectoryCardProps) {
  const location = formatCourseDisplayLocation(course);
  const roundCount = course.round_count ?? 0;
  const ratingDisplay =
    course.avg_rating !== null &&
    course.avg_rating !== undefined &&
    roundCount > 0
      ? formatCourseRatingDisplay(course.avg_rating)
      : null;
  const showCommunityBadge = shouldShowCommunityAddedBadge(course);
  const classificationPills = buildCourseClassificationPills(course);
  const activitySummary = buildCourseCardActivitySummary({
    avgRating: course.avg_rating,
    roundCount,
    memberCount: course.member_count ?? 0,
    recommendPct: course.recommend_pct,
  });

  return (
    <article className="et-course-card">
      <div className="et-course-card-media">
        <CourseImage
          name={course.name}
          city={course.city}
          region={course.region}
          country={course.country}
          imageUrl={course.image_url}
          thumbnailUrl={course.thumbnail_url}
          golfCourseId={course.id}
          variant="card"
          className="et-course-card-image"
        />
        {ratingDisplay ? (
          <span className="et-course-card-rating" aria-label={`Average rating ${ratingDisplay} out of 10.0`}>
            {ratingDisplay}
          </span>
        ) : null}
        {isOnBucketList ? (
          <span className="et-course-card-bucket" aria-label="On your bucket list">
            Bucket list
          </span>
        ) : null}
      </div>

      <div className="et-course-card-body">
        <div className="et-course-card-head">
          <div className="et-course-card-copy">
            <h3 className="et-course-card-title">{course.name}</h3>
            {location ? <p className="et-course-card-location">{location}</p> : null}
          </div>
        </div>

        {(showCommunityBadge || classificationPills.length > 0) ? (
          <div className="et-course-card-meta">
            {showCommunityBadge ? (
              <span className="et-course-card-pill et-course-card-pill--member">{COMMUNITY_ADDED_COURSE_LABEL}</span>
            ) : null}
            {classificationPills.map((pill) => (
              <span key={pill} className="et-course-card-pill">
                {pill}
              </span>
            ))}
          </div>
        ) : null}

        {activitySummary.length > 0 ? (
          <p className="et-course-card-activity">{activitySummary.join(" · ")}</p>
        ) : null}

        <button
          type="button"
          className="et-btn et-btn--secondary et-course-card-cta"
          onClick={() => onOpen(course.slug)}
        >
          View Course
        </button>
      </div>
    </article>
  );
}
