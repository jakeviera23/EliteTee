import { useState } from "react";
import type { CourseGeoCountryGroup } from "../../lib/courseDirectory";
import { CourseDirectoryCard } from "./CourseDirectoryCard";

const INITIAL_REGION_VISIBLE = 6;

type CourseGeoDirectoryProps = {
  groups: CourseGeoCountryGroup[];
  onOpen: (slug: string) => void;
  bucketListCourseIdSet?: Set<string>;
};

function RegionGroup({
  country,
  region,
  courses,
  onOpen,
  bucketListCourseIdSet,
}: {
  country: string;
  region: string;
  courses: CourseGeoCountryGroup["regions"][number]["courses"];
  onOpen: (slug: string) => void;
  bucketListCourseIdSet?: Set<string>;
}) {
  const regionId = `${country}-${region}`.replace(/\s+/g, "-").toLowerCase();
  const [expanded, setExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const visibleCourses = showAll ? courses : courses.slice(0, INITIAL_REGION_VISIBLE);
  const hiddenCount = Math.max(courses.length - INITIAL_REGION_VISIBLE, 0);

  return (
    <section className="et-courses-region" aria-labelledby={`${regionId}-heading`}>
      <button
        type="button"
        id={`${regionId}-heading`}
        className="et-courses-region-toggle"
        aria-expanded={expanded}
        aria-controls={`${regionId}-panel`}
        onClick={() => setExpanded((current) => !current)}
      >
        <span className="et-courses-region-name">{region}</span>
        <span className="et-courses-region-count">
          {courses.length} {courses.length === 1 ? "course" : "courses"}
        </span>
      </button>

      {expanded ? (
        <div id={`${regionId}-panel`} className="et-courses-region-panel">
          <ul className="et-courses-grid">
            {visibleCourses.map((course) => (
              <li key={course.id}>
                <CourseDirectoryCard
                  course={course}
                  onOpen={onOpen}
                  isOnBucketList={bucketListCourseIdSet?.has(course.id) ?? false}
                />
              </li>
            ))}
          </ul>
          {!showAll && hiddenCount > 0 ? (
            <button
              type="button"
              className="et-courses-region-more"
              onClick={() => setShowAll(true)}
            >
              View all in {region} ({hiddenCount} more)
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function CourseGeoDirectory({
  groups,
  onOpen,
  bucketListCourseIdSet,
}: CourseGeoDirectoryProps) {
  const [collapsedCountries, setCollapsedCountries] = useState<Record<string, boolean>>({});

  return (
    <div className="et-courses-geo">
      {groups.map((group) => {
        const countryId = group.country.replace(/\s+/g, "-").toLowerCase();
        const expanded = !collapsedCountries[group.country];

        return (
          <section
            key={group.country}
            className="et-courses-country"
            aria-labelledby={`${countryId}-heading`}
          >
            <button
              type="button"
              id={`${countryId}-heading`}
              className="et-courses-country-toggle"
              aria-expanded={expanded}
              aria-controls={`${countryId}-panel`}
              onClick={() =>
                setCollapsedCountries((current) => ({
                  ...current,
                  [group.country]: expanded,
                }))
              }
            >
              <span className="et-courses-country-name">{group.country}</span>
              <span className="et-courses-country-count">
                {group.courseCount} {group.courseCount === 1 ? "course" : "courses"}
              </span>
            </button>

            {expanded ? (
              <div id={`${countryId}-panel`} className="et-courses-country-panel">
                {group.regions.map((regionGroup) => (
                  <RegionGroup
                    key={`${group.country}-${regionGroup.region}`}
                    country={group.country}
                    region={regionGroup.region}
                    courses={regionGroup.courses}
                    onOpen={onOpen}
                    bucketListCourseIdSet={bucketListCourseIdSet}
                  />
                ))}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
