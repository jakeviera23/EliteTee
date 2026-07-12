import { FormEvent, useState } from "react";
import { adminCopy } from "../../data/adminCopy";
import { adminUpdateGolfCourseLocation, searchGolfCourses } from "../../lib/golfCourses";
import { formatAdminError } from "../../lib/memberProfiles";
import type { GolfCourseSearchResult } from "../../types/golfCourse";
import { shouldShowCommunityAddedBadge } from "../../types/golfCourse";

type AdminCoursesLocationPanelProps = {
  isLoading?: boolean;
};

export function AdminCoursesLocationPanel({ isLoading = false }: AdminCoursesLocationPanelProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GolfCourseSearchResult[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<GolfCourseSearchResult | null>(null);
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearching(true);
    setError(null);
    setMessage(null);

    const { data, error: searchError } = await searchGolfCourses({ query, limit: 20 });
    setSearching(false);

    if (searchError) {
      setError(formatAdminError(searchError));
      setResults([]);
      return;
    }

    setResults(data ?? []);
  }

  function selectCourse(course: GolfCourseSearchResult) {
    setSelectedCourse(course);
    setCity(course.city ?? "");
    setRegion(course.region ?? "");
    setCountry(course.country ?? "United States");
    setMessage(null);
    setError(null);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCourse) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    const { data, error: saveError } = await adminUpdateGolfCourseLocation({
      courseId: selectedCourse.id,
      city,
      region,
      country,
    });

    setSaving(false);

    if (saveError || !data) {
      setError(formatAdminError(saveError ?? new Error("Course location could not be updated.")));
      return;
    }

    setSelectedCourse(data);
    setResults((current) => current.map((course) => (course.id === data.id ? data : course)));
    setMessage(adminCopy.courses.locationSaved);
  }

  return (
    <section className="et-admin-section" aria-labelledby="admin-courses-location-heading">
      <header className="et-admin-section-head">
        <h3 id="admin-courses-location-heading">{adminCopy.courses.title}</h3>
        <p>{adminCopy.courses.lead}</p>
      </header>

      {isLoading ? <p className="et-admin-empty">{adminCopy.loading}</p> : null}

      <form className="et-admin-inline-form" onSubmit={handleSearch}>
        <label className="et-admin-field et-admin-field--grow">
          <span>{adminCopy.courses.searchLabel}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={adminCopy.courses.searchPlaceholder}
          />
        </label>
        <button type="submit" className="et-btn et-btn--secondary" disabled={searching}>
          {searching ? "Searching…" : adminCopy.courses.searchAction}
        </button>
      </form>

      {results.length > 0 ? (
        <ul className="et-admin-course-results">
          {results.map((course) => (
            <li key={course.id}>
              <button
                type="button"
                className={`et-admin-course-result${selectedCourse?.id === course.id ? " is-selected" : ""}`}
                onClick={() => selectCourse(course)}
              >
                <strong>{course.name}</strong>
                <span>
                  {[course.city, course.region, course.country].filter(Boolean).join(", ") ||
                    "Location incomplete"}
                </span>
                {shouldShowCommunityAddedBadge(course) ? (
                  <span className="et-admin-course-badge">Community Added</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {selectedCourse ? (
        <form className="et-admin-stack" onSubmit={handleSave}>
          <p className="et-admin-section-lead">
            {adminCopy.courses.editingLabel} <strong>{selectedCourse.name}</strong>
          </p>
          <label className="et-admin-field">
            <span>City</span>
            <input type="text" value={city} onChange={(event) => setCity(event.target.value)} required />
          </label>
          <label className="et-admin-field">
            <span>State / Region</span>
            <input type="text" value={region} onChange={(event) => setRegion(event.target.value)} required />
          </label>
          <label className="et-admin-field">
            <span>Country</span>
            <input type="text" value={country} onChange={(event) => setCountry(event.target.value)} required />
          </label>
          <button type="submit" className="et-btn et-btn--forest" disabled={saving}>
            {saving ? "Saving…" : adminCopy.courses.saveAction}
          </button>
        </form>
      ) : null}

      {message ? <p className="et-admin-success" role="status">{message}</p> : null}
      {error ? <p className="et-admin-error" role="alert">{error}</p> : null}
    </section>
  );
}
