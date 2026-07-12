import type { GolfCourseSearchResult } from "../../types/golfCourse";
import { CourseDirectoryCard } from "./CourseDirectoryCard";

type FeaturedSection = {
  id: string;
  title: string;
  description: string;
  courses: GolfCourseSearchResult[];
};

type CourseFeaturedSectionsProps = {
  sections: FeaturedSection[];
  onOpen: (slug: string) => void;
};

export function CourseFeaturedSections({ sections, onOpen }: CourseFeaturedSectionsProps) {
  const visibleSections = sections.filter((section) => section.courses.length > 0);
  if (visibleSections.length === 0) return null;

  return (
    <div className="et-courses-featured">
      {visibleSections.map((section) => (
        <section key={section.id} className="et-courses-featured-section" aria-labelledby={`${section.id}-heading`}>
          <div className="et-courses-featured-head">
            <h3 id={`${section.id}-heading`} className="et-courses-featured-title">
              {section.title}
            </h3>
            <p className="et-courses-featured-copy">{section.description}</p>
          </div>
          <ul className="et-courses-grid et-courses-grid--featured">
            {section.courses.map((course) => (
              <li key={`${section.id}-${course.id}`}>
                <CourseDirectoryCard course={course} onOpen={onOpen} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export type { FeaturedSection };
