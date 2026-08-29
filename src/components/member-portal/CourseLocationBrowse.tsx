import { useState } from "react";
import {
  CURATED_DESTINATION_PREVIEW_COUNT,
  splitDestinationsForPreview,
} from "../../lib/courseDisplay";
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
  onClearLocation,
}: CourseLocationBrowseProps) {
  const [showAllDestinations, setShowAllDestinations] = useState(false);
  const hasLocationSelection = Boolean(selectedCountry || selectedRegion || step === "all");

  const destinationPreview = splitDestinationsForPreview(
    countries,
    CURATED_DESTINATION_PREVIEW_COUNT,
  );
  const visibleCountries =
    step === "countries" && !showAllDestinations ? destinationPreview.preview : countries;

  return (
    <section className="et-courses-location" aria-labelledby="course-location-heading">
      <div className="et-courses-location-head">
        <div>
          <h3 id="course-location-heading" className="et-h3">
            Explore by destination
          </h3>
          <p className="et-body-sm et-courses-directory-copy">
            Start with a destination, then drill into regions and courses.
          </p>
        </div>
        <div className="et-courses-location-actions">
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

      <nav className="et-courses-breadcrumbs" aria-label="Course location">
        <ol>
          <li>
            <button
              type="button"
              className="et-courses-breadcrumb"
              onClick={() =>
                onNavigateBreadcrumb({ country: "", region: "", viewAll: false })
              }
              aria-current={step === "countries" ? "page" : undefined}
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
      </nav>

      {step === "countries" ? (
        <>
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
          {destinationPreview.hasMore && !showAllDestinations ? (
            <button
              type="button"
              className="et-courses-location-action et-courses-location-expand"
              onClick={() => setShowAllDestinations(true)}
            >
              View all destinations
            </button>
          ) : null}
        </>
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
