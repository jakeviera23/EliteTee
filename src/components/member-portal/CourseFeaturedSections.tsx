import { useState } from "react";
import type { GolfCourseSearchResult } from "../../types/golfCourse";
import { CourseDirectoryCard } from "./CourseDirectoryCard";

export type FeaturedDiscoveryCategory = "popular" | "highest-rated" | "recently-reviewed";

export type FeaturedDiscoveryData = Record<FeaturedDiscoveryCategory, GolfCourseSearchResult[]>;

const FEATURED_CATEGORY_LABELS: Record<FeaturedDiscoveryCategory, string> = {
  popular: "Popular",
  "highest-rated": "Highest Rated",
  "recently-reviewed": "Recently Reviewed",
};

const FEATURED_CATEGORY_COPY: Record<FeaturedDiscoveryCategory, string> = {
  popular: "Courses with the most member rounds and activity.",
  "highest-rated": "Top-rated destinations based on member reviews.",
  "recently-reviewed": "Courses with the latest member round activity.",
};

const FEATURED_CATEGORY_ORDER: FeaturedDiscoveryCategory[] = [
  "recently-reviewed",
  "popular",
  "highest-rated",
];

type CourseFeaturedSectionsProps = {
  categories: FeaturedDiscoveryData;
  onOpen: (slug: string) => void;
  bucketListCourseIdSet?: Set<string>;
};

export function CourseFeaturedSections({
  categories,
  onOpen,
  bucketListCourseIdSet,
}: CourseFeaturedSectionsProps) {
  const availableCategories = FEATURED_CATEGORY_ORDER.filter(
    (category) => categories[category].length > 0,
  );

  const [activeCategory, setActiveCategory] = useState<FeaturedDiscoveryCategory>(
    "recently-reviewed",
  );

  const resolvedCategory = availableCategories.includes(activeCategory)
    ? activeCategory
    : availableCategories[0];

  if (!resolvedCategory) return null;

  const activeCourses = categories[resolvedCategory];

  return (
    <section
      className="et-courses-featured-discovery"
      aria-labelledby="featured-discovery-heading"
    >
      <div className="et-courses-featured-head">
        <h3 id="featured-discovery-heading" className="et-courses-featured-title">
          Featured in EliteTee
        </h3>
        <p className="et-courses-featured-copy">{FEATURED_CATEGORY_COPY[resolvedCategory]}</p>
      </div>

      <div
        className="et-courses-featured-tabs"
        role="tablist"
        aria-label="Featured course categories"
      >
        {FEATURED_CATEGORY_ORDER.map((category) => {
          const courseCount = categories[category].length;
          if (courseCount === 0) return null;

          const isActive = category === resolvedCategory;

          return (
            <button
              key={category}
              type="button"
              role="tab"
              id={`featured-tab-${category}`}
              className={`et-courses-featured-tab${isActive ? " is-active" : ""}`}
              aria-selected={isActive}
              aria-controls="featured-discovery-panel"
              onClick={() => setActiveCategory(category)}
            >
              {FEATURED_CATEGORY_LABELS[category]}
            </button>
          );
        })}
      </div>

      <div
        id="featured-discovery-panel"
        role="tabpanel"
        aria-labelledby={`featured-tab-${resolvedCategory}`}
        className="et-courses-featured-panel"
      >
        <ul className="et-courses-grid et-courses-grid--featured-compact">
          {activeCourses.map((course) => (
            <li key={course.id}>
              <CourseDirectoryCard
                course={course}
                onOpen={onOpen}
                isOnBucketList={bucketListCourseIdSet?.has(course.id) ?? false}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
