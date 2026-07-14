import { Link } from "react-router-dom";
import type { BucketListCourseSummary } from "../../../lib/bucketListCourses";

type ProfileBucketListProps = {
  courses: BucketListCourseSummary[];
  isLoading?: boolean;
};

export function ProfileBucketList({ courses, isLoading = false }: ProfileBucketListProps) {
  if (isLoading) {
    return <p className="et-profile-loading">Loading bucket list…</p>;
  }

  if (courses.length === 0) {
    return (
      <div className="et-profile-empty">
        <p className="et-profile-empty-title">No bucket list courses yet</p>
        <p className="et-profile-empty-copy">
          Save courses from the library to build your list of places you want to play next.
        </p>
      </div>
    );
  }

  return (
    <div className="et-profile-bucket-list">
      <p className="et-profile-bucket-count" aria-live="polite">
        {courses.length} saved {courses.length === 1 ? "course" : "courses"}
      </p>
      <ul className="et-profile-courses-grid">
        {courses.map((course) => (
          <li key={course.id}>
            <Link to={`/courses/${course.slug}`} className="et-profile-course-card">
              <span className="et-profile-course-name">{course.name}</span>
              <span className="et-profile-course-meta">{course.location}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
