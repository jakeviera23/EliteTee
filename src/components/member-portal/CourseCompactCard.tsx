import { formatGolfCourseLocation, type GolfCourseSearchResult } from "../../types/golfCourse";

type CourseCompactCardProps = {
  course: GolfCourseSearchResult;
  onOpen: (slug: string) => void;
};

function formatRecommendPct(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `${Math.round(value)}%`;
}

function formatLatestActivity(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function CourseCompactCard({ course, onOpen }: CourseCompactCardProps) {
  const location = formatGolfCourseLocation(course);
  const roundCount = course.round_count ?? 0;
  const memberCount = course.member_count ?? 0;

  return (
    <article className="golf-course-compact-card">
      <div className="golf-course-compact-card-body">
        <div className="golf-course-compact-card-head">
          <div className="golf-course-compact-card-copy">
            <h4 className="golf-course-compact-card-title">{course.name}</h4>
            {location ? <p className="golf-course-compact-card-location">{location}</p> : null}
          </div>
          <button
            type="button"
            className="portal-btn portal-btn--outline portal-btn--compact golf-course-compact-card-cta"
            onClick={() => onOpen(course.slug)}
          >
            View Course
          </button>
        </div>

        <dl className="golf-course-compact-card-stats">
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
            <dd>{formatRecommendPct(course.recommend_pct ?? null)}</dd>
          </div>
          <div>
            <dt>Latest</dt>
            <dd>{formatLatestActivity(course.latest_activity_at ?? null)}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
