import { FormEvent, useEffect, useState, type ReactNode } from "react";
import { experienceCopy } from "../../data/portalSocial";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { searchGolfCourses } from "../../lib/golfCourses";
import { createCourseRoundFeedPost } from "../../lib/memberFeedPosts";
import { uploadCourseRoundPhotos } from "../../lib/memberCourseRoundPhotos";
import { submitMemberCourseRound } from "../../lib/memberCourseRounds";
import type { GolfCourseSearchResult } from "../../types/golfCourse";
import { formatGolfCourseLocation } from "../../types/golfCourse";
import type { MemberCourseRoundInsert } from "../../types/memberCourseRound";
import type { CourseRoundPhotoDraft } from "../../types/memberCourseRoundPhoto";
import { validateCourseRating } from "../../lib/courseRating";
import { CourseRatingPicker } from "./CourseRatingPicker";
import { RoundPhotoPicker } from "./RoundPhotoPicker";
import "../../member-portal-experience.css";

type AddCoursePlayedModalProps = {
  onClose: () => void;
  onSubmitted?: () => void;
  initialCourse?: {
    golf_course_id: string;
    course_name: string;
    location: string;
  };
};

const emptyForm: Omit<MemberCourseRoundInsert, "course_rating"> & { course_rating: number | null } = {
  course_name: "",
  location: "",
  played_on: "",
  note: "",
  would_play_again: true,
  golf_course_id: null,
  course_rating: null,
};

const US_STATES = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
] as const;

function buildStructuredLocation(city: string, region: string, country: string) {
  return [city.trim(), region.trim(), country.trim()].filter(Boolean).join(", ");
}

function ExperienceSection({
  step,
  title,
  description,
  children,
}: {
  step: number;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="et-experience-section" aria-labelledby={`experience-section-${step}`}>
      <header className="et-experience-section-head">
        <p className="et-experience-section-eyebrow">Section {step}</p>
        <h3 id={`experience-section-${step}`} className="et-experience-section-title">
          {title}
        </h3>
        {description ? <p className="et-experience-section-lead">{description}</p> : null}
      </header>
      <div className="et-experience-section-body">{children}</div>
    </section>
  );
}

export function AddCoursePlayedModal({
  onClose,
  onSubmitted,
  initialCourse,
}: AddCoursePlayedModalProps) {
  const [form, setForm] = useState(() =>
    initialCourse
      ? {
          ...emptyForm,
          golf_course_id: initialCourse.golf_course_id,
          course_name: initialCourse.course_name,
          location: initialCourse.location,
        }
      : emptyForm,
  );
  const [manualEntry, setManualEntry] = useState(!initialCourse);
  const [structuredLocation, setStructuredLocation] = useState(() => ({
    city: "",
    region: "",
    country: "United States",
  }));
  const [suggestions, setSuggestions] = useState<GolfCourseSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debouncedCourseName = useDebouncedValue(form.course_name, 250);
  const [photoDrafts, setPhotoDrafts] = useState<CourseRoundPhotoDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoWarning, setPhotoWarning] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    return () => {
      for (const draft of photoDrafts) {
        URL.revokeObjectURL(draft.previewUrl);
      }
    };
  }, [photoDrafts]);

  useEffect(() => {
    if (manualEntry || debouncedCourseName.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    let active = true;

    async function loadSuggestions() {
      setIsSearching(true);
      const { data } = await searchGolfCourses({
        query: debouncedCourseName,
        limit: 8,
        offset: 0,
      });

      if (!active) return;
      setSuggestions(data ?? []);
      setIsSearching(false);
    }

    void loadSuggestions();

    return () => {
      active = false;
    };
  }, [debouncedCourseName, manualEntry]);

  function selectSuggestion(course: GolfCourseSearchResult) {
    const location = formatGolfCourseLocation(course);
    setForm((current) => ({
      ...current,
      golf_course_id: course.id,
      course_name: course.name,
      location: location || current.location,
    }));
    setManualEntry(false);
    setSuggestions([]);
  }

  function enableManualEntry() {
    setManualEntry(true);
    setForm((current) => ({ ...current, golf_course_id: null }));
    setSuggestions([]);
    setStructuredLocation({ city: "", region: "", country: "United States" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const usingStructured = manualEntry && !form.golf_course_id;
    const normalizedLocation = usingStructured
      ? buildStructuredLocation(
          structuredLocation.city,
          structuredLocation.region,
          structuredLocation.country,
        )
      : form.location.trim();

    if (!form.course_name.trim() || !normalizedLocation || !form.played_on) {
      return;
    }

    if (usingStructured) {
      const country = structuredLocation.country.trim();
      const city = structuredLocation.city.trim();
      const region = structuredLocation.region.trim();
      if (!country) {
        setError("Country is required.");
        return;
      }
      if (!city) {
        setError("City is required.");
        return;
      }
      if (country === "United States" && !region) {
        setError("State is required for United States courses.");
        return;
      }
    }

    const ratingResult = validateCourseRating(form.course_rating);
    if (!ratingResult.ok) {
      setError(ratingResult.message);
      return;
    }

    setSubmitting(true);
    setError(null);
    setPhotoWarning(null);

    const { data: roundData, error: submitError } = await submitMemberCourseRound({
      ...form,
      location: normalizedLocation,
      course_rating: ratingResult.value,
    });

    if (submitError || !roundData?.id) {
      setSubmitting(false);
      setError(submitError?.message ?? "Your experience could not be saved.");
      return;
    }

    const { error: feedError } = await createCourseRoundFeedPost({
      roundId: roundData.id,
      courseName: form.course_name,
      location: form.location,
      note: form.note,
      wouldPlayAgain: form.would_play_again,
      playedOn: form.played_on,
      courseRating: ratingResult.value,
    });

    let feedWarning: string | null = null;
    if (feedError) {
      feedWarning = "Your experience was saved, but it could not be added to the member feed yet.";
    }

    if (photoDrafts.length > 0) {
      const { data: uploadResult, error: uploadError } = await uploadCourseRoundPhotos(
        roundData.id,
        photoDrafts.map((draft) => ({
          file: draft.file,
          caption: draft.caption,
          sortOrder: draft.sortOrder,
        })),
      );

      setSubmitting(false);

      if (uploadError) {
        setPhotoWarning(
          feedWarning ??
            "Your experience was saved, but photos could not be uploaded. You can try adding photos again later.",
        );
        setSubmitted(true);
        onSubmitted?.();
        return;
      }

      const uploadedCount = uploadResult?.uploaded.length ?? 0;
      const failedCount = uploadResult?.failed.length ?? 0;

      if (failedCount > 0 && uploadedCount > 0) {
        const failedNames = uploadResult?.failed.map((item) => item.fileName).join(", ") ?? "";
        setPhotoWarning(
          `${feedWarning ? `${feedWarning} ` : ""}Your experience was saved. ${uploadedCount} photo${uploadedCount === 1 ? "" : "s"} uploaded, but ${failedCount} failed (${failedNames}).`,
        );
      } else if (failedCount > 0 && uploadedCount === 0) {
        const firstFailure = uploadResult?.failed[0]?.message ?? "Photo upload failed.";
        setPhotoWarning(
          `${feedWarning ? `${feedWarning} ` : ""}Your experience was saved, but photos could not be uploaded: ${firstFailure}`,
        );
      } else if (feedWarning) {
        setPhotoWarning(feedWarning);
      }

      setSubmitted(true);
      onSubmitted?.();
      return;
    }

    setSubmitting(false);
    if (feedWarning) {
      setPhotoWarning(feedWarning);
    }
    setSubmitted(true);
    onSubmitted?.();
  }

  return (
    <div className="portal-modal-backdrop" role="presentation" onClick={onClose}>
      <article
        className="portal-modal portal-modal--course-played et-experience-modal"
        role="dialog"
        aria-labelledby="share-experience-heading"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="portal-modal-head">
          <h2 id="share-experience-heading">{experienceCopy.shareTitle}</h2>
          <button type="button" className="portal-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        {submitted ? (
          <div className="et-experience-sent" role="status">
            <p className="et-experience-sent-title">{experienceCopy.shareSuccessTitle}</p>
            <p className="et-experience-sent-copy">{experienceCopy.shareSuccessBody}</p>
            {photoWarning ? <p className="et-experience-warning">{photoWarning}</p> : null}
            <button type="button" className="et-btn et-btn--forest et-btn--full portal-btn--full" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <form className="portal-course-played-form et-experience-form" onSubmit={handleSubmit}>
            <p className="et-experience-lead">{experienceCopy.shareLead}</p>

            <ExperienceSection
              step={1}
              title={experienceCopy.chooseCourseTitle}
              description={experienceCopy.chooseCourseLead}
            >
              <label className="portal-profile-field portal-profile-field--full">
                <span>Course name</span>
                <input
                  type="text"
                  value={form.course_name}
                  onChange={(event) => {
                    setForm((current) => ({
                      ...current,
                      course_name: event.target.value,
                      golf_course_id: manualEntry ? null : current.golf_course_id,
                    }));
                    if (!manualEntry && event.target.value !== form.course_name) {
                      setManualEntry(true);
                      setForm((current) => ({ ...current, golf_course_id: null }));
                    }
                  }}
                  required
                  autoComplete="off"
                />
              </label>

              {!manualEntry && form.golf_course_id ? (
                <p className="et-experience-match" role="status">
                  {experienceCopy.linkedToLibrary}
                </p>
              ) : null}

              {isSearching ? (
                <p className="et-experience-searching">{experienceCopy.searchingCourses}</p>
              ) : null}

              {suggestions.length > 0 ? (
                <ul className="et-experience-suggestions" role="listbox" aria-label="Course matches">
                  {suggestions.map((course) => {
                    const location = formatGolfCourseLocation(course);
                    return (
                      <li key={course.id}>
                        <button
                          type="button"
                          className="et-experience-suggestion"
                          onClick={() => selectSuggestion(course)}
                        >
                          <span>{course.name}</span>
                          {location ? <span>{location}</span> : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}

              <button type="button" className="et-experience-manual" onClick={enableManualEntry}>
                {experienceCopy.manualEntry}
              </button>

              {manualEntry && !form.golf_course_id ? (
                <div className="et-experience-location-grid">
                  <label className="portal-profile-field portal-profile-field--full">
                    <span>City</span>
                    <input
                      type="text"
                      value={structuredLocation.city}
                      onChange={(event) =>
                        setStructuredLocation((current) => ({ ...current, city: event.target.value }))
                      }
                      required
                      autoComplete="off"
                    />
                  </label>

                  <label className="portal-profile-field portal-profile-field--full">
                    <span>Country</span>
                    <select
                      value={structuredLocation.country}
                      onChange={(event) =>
                        setStructuredLocation((current) => ({
                          ...current,
                          country: event.target.value,
                          region: event.target.value === "United States" ? current.region : current.region,
                        }))
                      }
                      required
                    >
                      <option value="United States">United States</option>
                      <option value="Canada">Canada</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Ireland">Ireland</option>
                      <option value="Australia">Australia</option>
                      <option value="New Zealand">New Zealand</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>

                  {structuredLocation.country === "United States" ? (
                    <label className="portal-profile-field portal-profile-field--full">
                      <span>State</span>
                      <select
                        value={structuredLocation.region}
                        onChange={(event) =>
                          setStructuredLocation((current) => ({ ...current, region: event.target.value }))
                        }
                        required
                      >
                        <option value="">Select a state</option>
                        {US_STATES.map((state) => (
                          <option key={state} value={state}>
                            {state}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <label className="portal-profile-field portal-profile-field--full">
                      <span>State / province / region</span>
                      <input
                        type="text"
                        value={structuredLocation.region}
                        onChange={(event) =>
                          setStructuredLocation((current) => ({ ...current, region: event.target.value }))
                        }
                        autoComplete="off"
                      />
                    </label>
                  )}
                </div>
              ) : (
                <label className="portal-profile-field portal-profile-field--full">
                  <span>Location</span>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                    placeholder="City, region, or country"
                    required
                    autoComplete="off"
                  />
                </label>
              )}
            </ExperienceSection>

            <ExperienceSection
              step={2}
              title={experienceCopy.experienceTitle}
              description={experienceCopy.experienceLead}
            >
              <label className="portal-profile-field portal-profile-field--full">
                <span>Date played</span>
                <input
                  type="date"
                  value={form.played_on}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(event) => setForm((current) => ({ ...current, played_on: event.target.value }))}
                  required
                />
              </label>

              <CourseRatingPicker
                value={form.course_rating}
                onChange={(course_rating) => setForm((current) => ({ ...current, course_rating }))}
                disabled={submitting}
              />

              <label className="portal-profile-field portal-profile-field--full">
                <span>{experienceCopy.reviewLabel}</span>
                <textarea
                  rows={4}
                  value={form.note}
                  onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                  placeholder={experienceCopy.reviewPlaceholder}
                />
              </label>

              <fieldset className="et-experience-choice">
                <legend>{experienceCopy.wouldPlayAgain}</legend>
                <div className="et-experience-choice-options">
                  <label className="et-experience-choice-option">
                    <input
                      type="radio"
                      name="would_play_again"
                      checked={form.would_play_again}
                      onChange={() => setForm((current) => ({ ...current, would_play_again: true }))}
                    />
                    <span>Yes</span>
                  </label>
                  <label className="et-experience-choice-option">
                    <input
                      type="radio"
                      name="would_play_again"
                      checked={!form.would_play_again}
                      onChange={() => setForm((current) => ({ ...current, would_play_again: false }))}
                    />
                    <span>No</span>
                  </label>
                </div>
              </fieldset>
            </ExperienceSection>

            <ExperienceSection
              step={3}
              title={experienceCopy.photographyTitle}
              description={experienceCopy.photographyLead}
            >
              <RoundPhotoPicker drafts={photoDrafts} onChange={setPhotoDrafts} disabled={submitting} />
            </ExperienceSection>

            <ExperienceSection
              step={4}
              title={experienceCopy.detailsTitle}
              description={experienceCopy.detailsLead}
            >
              <div className="et-experience-future-grid" aria-hidden="true">
                {experienceCopy.futureFields.map((field) => (
                  <div key={field.key} className="et-experience-future-field">
                    <p className="et-experience-future-label">{field.label}</p>
                    <p className="et-experience-future-soon">Later</p>
                  </div>
                ))}
              </div>
              <p className="et-experience-future-note">{experienceCopy.futureFieldsNote}</p>
            </ExperienceSection>

            <div className="et-experience-footer">
              {error ? (
                <p className="et-experience-error portal-course-played-error" role="alert">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                className="et-btn et-btn--forest et-btn--full"
                disabled={submitting || !form.course_rating}
              >
                {submitting ? experienceCopy.shareSaving : experienceCopy.shareSubmit}
              </button>
            </div>
          </form>
        )}
      </article>
    </div>
  );
}
