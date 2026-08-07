import { useMemo, useState } from "react";
import type {
  LocationBrowseCountry,
  LocationBrowseRegion,
  LocationBrowseStep,
} from "../../lib/courseDirectoryLocation";

type CourseLocationBrowseProps = {
  step: LocationBrowseStep;
  countries: LocationBrowseCountry[];
  regions: LocationBrowseRegion[];
  selectedCountry: string;
  selectedRegion: string;
  regionCourseCount: number;
  onSelectCountry: (country: string) => void;
  onSelectRegion: (region: string) => void;
  onNavigateBreadcrumb: (state: { country: string; region: string; viewAll: boolean }) => void;
  onViewAllCourses: () => void;
  onClearLocation: () => void;
};

function formatCount(count: number): string {
  return `${count} ${count === 1 ? "course" : "courses"}`;
}

export function CourseLocationBrowse({
  step,
  countries,
  regions,
  selectedCountry,
  selectedRegion,
  regionCourseCount,
  onSelectCountry,
  onSelectRegion,
  onNavigateBreadcrumb,
  onViewAllCourses,
  onClearLocation,
}: CourseLocationBrowseProps) {
  const hasLocationSelection = Boolean(selectedCountry || selectedRegion || step === "all");
  const [showAllCountries, setShowAllCountries] = useState(false);
  const rankedCountries = useMemo(
    () =>
      [...countries].sort(
        (a, b) => b.courseCount - a.courseCount || a.country.localeCompare(b.country),
      ),
    [countries],
  );
  const visibleCountries = showAllCountries ? rankedCountries : rankedCountries.slice(0, 6);
  const hiddenCountryCount = Math.max(rankedCountries.length - visibleCountries.length, 0);

  return (
    <section className="et-courses-location" aria-labelledby="course-location-heading">
      <div className="et-courses-location-head">
        <div>
          <h3 id="course-location-heading" className="et-h3">
            {step === "countries" && !showAllCountries ? "Popular destinations" : "Browse by location"}
          </h3>
          <p className="et-body-sm et-courses-directory-copy">
            {step === "countries" && !showAllCountries
              ? "Start with the strongest parts of the library or browse every destination."
              : "Choose a destination, then drill into regions and courses."}
          </p>
        </div>
        <div className="et-courses-location-actions">
          <button
            type="button"
            className="et-courses-location-action"
            onClick={onViewAllCourses}
          >
            View all courses
          </button>
          {hasLocationSelection ? (
            <button
              type="button"
              className="et-courses-location-action"
              onClick={onClearLocation}
            >
              Clear location
            </button>
          ) : null}
        </div>
      </div>

      {step !== "countries" ? <nav className="et-courses-breadcrumbs" aria-label="Course location">
        <ol>
          <li>
            <button
              type="button"
              className="et-courses-breadcrumb"
              onClick={() =>
                onNavigateBreadcrumb({ country: "", region: "", viewAll: false })
              }
            >
              Courses
            </button>
          </li>
          {selectedCountry ? (
            <li>
              <button
                type="button"
                className="et-courses-breadcrumb"
                onClick={() =>
                  onNavigateBreadcrumb({
                    country: selectedCountry,
                    region: "",
                    viewAll: false,
                  })
                }
                aria-current={step === "regions" ? "page" : undefined}
              >
                {selectedCountry}
              </button>
            </li>
          ) : null}
          {selectedRegion ? (
            <li>
              <span className="et-courses-breadcrumb et-courses-breadcrumb--current" aria-current="page">
                {selectedRegion}
              </span>
            </li>
          ) : null}
          {step === "all" ? (
            <li>
              <span className="et-courses-breadcrumb et-courses-breadcrumb--current" aria-current="page">
                All courses
              </span>
            </li>
          ) : null}
        </ol>
      </nav> : null}

      {step === "countries" ? (
        <ul className="et-courses-location-grid">
          {visibleCountries.map((entry) => (
            <li key={entry.country}>
              <button
                type="button"
                className="et-courses-location-card"
                onClick={() => onSelectCountry(entry.country)}
              >
                <span className="et-courses-location-card-name">{entry.country}</span>
                <span className="et-courses-location-card-count">{formatCount(entry.courseCount)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {step === "countries" && hiddenCountryCount > 0 ? (
        <button
          type="button"
          className="et-courses-location-more"
          onClick={() => setShowAllCountries(true)}
        >
          Browse all {rankedCountries.length} destinations
        </button>
      ) : null}

      {step === "regions" ? (
        <ul className="et-courses-location-grid">
          {regions.map((entry) => (
            <li key={entry.region}>
              <button
                type="button"
                className="et-courses-location-card"
                onClick={() => onSelectRegion(entry.region)}
              >
                <span className="et-courses-location-card-name">{entry.region}</span>
                <span className="et-courses-location-card-count">{formatCount(entry.courseCount)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {step === "courses" ? (
        <p className="et-courses-location-summary">
          {formatCount(regionCourseCount)} in {selectedRegion}, {selectedCountry}
        </p>
      ) : null}

      {step === "all" ? (
        <p className="et-courses-location-summary">Showing every course in the library.</p>
      ) : null}
    </section>
  );
}
