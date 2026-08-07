import {
  COMMUNITY_ADDED_COURSE_LABEL,
  formatGolfCourseLocation,
  shouldShowCommunityAddedBadge,
  type GolfCourseSearchResult,
} from "../../types/golfCourse";
import { formatCourseRatingDisplay } from "../../lib/courseRating";
import { CourseImage } from "./CourseImage";
import { ClubMark } from "./ClubMark";

type CourseDirectoryCardProps = {
  course: GolfCourseSearchResult;
  onOpen: (slug: string) => void;
  isOnBucketList?: boolean;
};

function formatRecommendLabel(value: number | null | undefined, roundCount: number) {
  if (roundCount === 0 || value === null || value === undefined) {
    return "No recommend data yet";
  }
  return `${Math.round(value)}% would play again`;
}

export function CourseDirectoryCard({ course, onOpen, isOnBucketList = false }: CourseDirectoryCardProps) {
  const location = formatGolfCourseLocation(course);
  const roundCount = course.round_count ?? 0;
  const memberCount = course.member_count ?? 0;
  const ratingDisplay =
    course.avg_rating !== null &&
    course.avg_rating !== undefined &&
    roundCount > 0
      ? formatCourseRatingDisplay(course.avg_rating)
      : null;
  const showCommunityBadge = shouldShowCommunityAddedBadge(course);

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
          <ClubMark name={course.name} size="sm" />
          <div className="et-course-card-copy">
            <h3 className="et-course-card-title">{course.name}</h3>
            {location ? (
              <p className="et-course-card-location">{location}</p>
            ) : (
              <p className="et-course-card-location et-course-card-location--empty">
                Location details not available
              </p>
            )}
          </div>
        </div>

        <div className="et-course-card-meta">
          {showCommunityBadge ? (
            <span className="et-course-card-pill et-course-card-pill--member">{COMMUNITY_ADDED_COURSE_LABEL}</span>
          ) : null}
          {course.course_type ? (
            <span className="et-course-card-pill">{course.course_type}</span>
          ) : null}
          {course.access_type ? (
            <span className="et-course-card-pill">{course.access_type}</span>
          ) : null}
        </div>

        {roundCount > 0 ? (
          <p className="et-course-card-proof">
            {memberCount} {memberCount === 1 ? "member" : "members"}
            <span aria-hidden="true"> · </span>
            {roundCount} {roundCount === 1 ? "round" : "rounds"}
            <span aria-hidden="true"> · </span>
            {formatRecommendLabel(course.recommend_pct ?? null, roundCount)}
          </p>
        ) : (
          <p className="et-course-card-no-activity">Not yet reviewed by EliteTee members</p>
        )}

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
