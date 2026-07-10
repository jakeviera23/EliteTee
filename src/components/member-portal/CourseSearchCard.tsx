import { formatGolfCourseLocation, type GolfCourseSearchResult } from "../../types/golfCourse";
import { CourseImage } from "./CourseImage";

type CourseSearchCardProps = {
  course: GolfCourseSearchResult;
  onOpen: (slug: string) => void;
};

function formatRecommendPct(value: number | null | undefined) {
  if (value === null || value === undefined) return null;
  return `${Math.round(value)}% recommend`;
}

function formatLatestActivity(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatAccessType(value: string | null | undefined) {
  if (!value?.trim()) return null;
  return value.trim();
}

export function CourseSearchCard({ course, onOpen }: CourseSearchCardProps) {
  const location = formatGolfCourseLocation(course);
  const recommendLabel = formatRecommendPct(course.recommend_pct ?? null);
  const latestDate = formatLatestActivity(course.latest_activity_at ?? null);
  const roundCount = course.round_count ?? 0;
  const memberCount = course.member_count ?? 0;

  return (
    <article className="golf-course-search-card">
      <div className="golf-course-search-card-layout">
        <CourseImage
          name={course.name}
          city={course.city}
          region={course.region}
          country={course.country}
          imageUrl={course.image_url}
          thumbnailUrl={course.thumbnail_url}
          variant="card"
          overlay
        />

        <div className="golf-course-search-card-body">
          <div className="golf-course-search-card-head">
            <div>
              <h3 className="golf-course-search-card-title">{course.name}</h3>
              {location ? <p className="golf-course-search-card-location">{location}</p> : null}
            </div>
            <button
              type="button"
              className="portal-btn portal-btn--outline portal-btn--compact golf-course-search-card-cta"
              onClick={() => onOpen(course.slug)}
            >
              View Course
            </button>
          </div>

          <div className="golf-course-search-card-meta">
            {formatAccessType(course.access_type) ? (
              <span className="golf-course-search-card-pill">{course.access_type}</span>
            ) : null}
            {course.course_type ? (
              <span className="golf-course-search-card-pill">{course.course_type}</span>
            ) : null}
            {course.holes ? <span className="golf-course-search-card-pill">{course.holes} holes</span> : null}
          </div>

          <dl className="golf-course-search-card-stats">
            <div>
              <dt>Members</dt>
              <dd>{memberCount > 0 ? memberCount : "—"}</dd>
            </div>
            <div>
              <dt>Rounds</dt>
              <dd>{roundCount > 0 ? roundCount : "—"}</dd>
            </div>
            <div>
              <dt>Recommend</dt>
              <dd>{recommendLabel ?? "—"}</dd>
            </div>
            <div>
              <dt>Latest</dt>
              <dd>{latestDate ?? "—"}</dd>
            </div>
          </dl>

          {roundCount === 0 ? (
            <p className="golf-course-search-card-empty-note">No EliteTee rounds shared yet</p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
