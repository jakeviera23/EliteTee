import { Link } from "react-router-dom";
import {
  formatProfileCoursePlayedMeta,
  type ProfileCoursePlayedSummary,
} from "../../../lib/profilePageDisplay";
import { ClubMark } from "../ClubMark";

type ProfileCoursesPlayedProps = {
  courses: ProfileCoursePlayedSummary[];
  isViewingOther: boolean;
};

export function ProfileCoursesPlayed({ courses, isViewingOther }: ProfileCoursesPlayedProps) {
  if (courses.length === 0) {
    return (
      <div className="et-profile-empty">
        <p className="et-profile-empty-title">No courses played yet</p>
        <p className="et-profile-empty-copy">
          {isViewingOther
            ? "This member has not shared course rounds yet."
            : "Add a course round from Courses to build your golf history."}
        </p>
      </div>
    );
  }

  return (
    <ul className="et-profile-courses-grid">
      {courses.map((course) => {
        const meta = formatProfileCoursePlayedMeta(course);
        const content = (
          <>
            <ClubMark name={course.courseName} size="sm" />
            <span className="et-profile-course-copy">
              <span className="et-profile-course-name">{course.courseName}</span>
              <span className="et-profile-course-meta">{meta}</span>
            </span>
          </>
        );

        return (
          <li key={course.key}>
            {course.courseSlug ? (
              <Link to={`/courses/${course.courseSlug}`} className="et-profile-course-card">
                {content}
              </Link>
            ) : (
              <div className="et-profile-course-card et-profile-course-card--static">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
