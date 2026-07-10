import { FormEvent, useEffect, useState } from "react";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { searchGolfCourses } from "../../lib/golfCourses";
import { createCourseRoundFeedPost } from "../../lib/memberFeedPosts";
import { uploadCourseRoundPhotos } from "../../lib/memberCourseRoundPhotos";
import { submitMemberCourseRound } from "../../lib/memberCourseRounds";
import type { GolfCourseSearchResult } from "../../types/golfCourse";
import { formatGolfCourseLocation } from "../../types/golfCourse";
import type { MemberCourseRoundInsert } from "../../types/memberCourseRound";
import type { CourseRoundPhotoDraft } from "../../types/memberCourseRoundPhoto";
import { RoundPhotoPicker } from "./RoundPhotoPicker";

type AddCoursePlayedModalProps = {
  onClose: () => void;
  onSubmitted?: () => void;
  initialCourse?: {
    golf_course_id: string;
    course_name: string;
    location: string;
  };
};

const emptyForm: MemberCourseRoundInsert = {
  course_name: "",
  location: "",
  played_on: "",
  note: "",
  would_play_again: true,
  golf_course_id: null,
};

export function AddCoursePlayedModal({
  onClose,
  onSubmitted,
  initialCourse,
}: AddCoursePlayedModalProps) {
  const [form, setForm] = useState<MemberCourseRoundInsert>(() =>
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
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.course_name.trim() || !form.location.trim() || !form.played_on) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setPhotoWarning(null);

    const { data: roundData, error: submitError } = await submitMemberCourseRound(form);

    if (submitError || !roundData?.id) {
      setSubmitting(false);
      setError(submitError?.message ?? "Your round could not be saved.");
      return;
    }

    const { error: feedError } = await createCourseRoundFeedPost({
      roundId: roundData.id,
      courseName: form.course_name,
      location: form.location,
      note: form.note,
      wouldPlayAgain: form.would_play_again,
      playedOn: form.played_on,
    });

    let feedWarning: string | null = null;
    if (feedError) {
      feedWarning = "Your round was saved, but it could not be added to the member feed yet.";
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
            "Your round was saved, but photos could not be uploaded. You can try adding photos again later.",
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
          `${feedWarning ? `${feedWarning} ` : ""}Your round was saved. ${uploadedCount} photo${uploadedCount === 1 ? "" : "s"} uploaded, but ${failedCount} failed (${failedNames}).`,
        );
      } else if (failedCount > 0 && uploadedCount === 0) {
        const firstFailure = uploadResult?.failed[0]?.message ?? "Photo upload failed.";
        setPhotoWarning(
          `${feedWarning ? `${feedWarning} ` : ""}Your round was saved, but photos could not be uploaded: ${firstFailure}`,
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
        className="portal-modal portal-modal--course-played"
        role="dialog"
        aria-labelledby="add-course-played-heading"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="portal-modal-head">
          <h2 id="add-course-played-heading">Add Course Played</h2>
          <button type="button" className="portal-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        {submitted ? (
          <div className="portal-course-played-sent" role="status">
            <p className="portal-course-played-sent-title">Round added.</p>
            <p>Thanks for sharing where you played. Member rounds help the EliteTee course library grow.</p>
            {photoWarning ? <p className="portal-course-played-warning">{photoWarning}</p> : null}
            <button type="button" className="portal-btn portal-btn--gold portal-btn--full" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <form className="portal-course-played-form" onSubmit={handleSubmit}>
            <p className="portal-course-played-lead">
              Share a course you&apos;ve played. Search the library or enter a course manually if it is
              not listed yet.
            </p>

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
              <p className="portal-course-played-match" role="status">
                Linked to EliteTee course library.
              </p>
            ) : null}

            {isSearching ? <p className="portal-course-played-searching">Searching courses…</p> : null}

            {suggestions.length > 0 ? (
              <ul className="portal-course-played-suggestions" role="listbox" aria-label="Course matches">
                {suggestions.map((course) => {
                  const location = formatGolfCourseLocation(course);
                  return (
                    <li key={course.id}>
                      <button
                        type="button"
                        className="portal-course-played-suggestion"
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

            <button
              type="button"
              className="portal-course-played-manual"
              onClick={enableManualEntry}
            >
              Course not listed — enter manually
            </button>

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

            <label className="portal-profile-field portal-profile-field--full">
              <span>Short note about the experience</span>
              <textarea
                rows={4}
                value={form.note}
                onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                placeholder="What stood out—layout, conditions, hospitality, travel tips…"
              />
            </label>

            <fieldset className="portal-course-played-choice">
              <legend>Would play again?</legend>
              <div className="portal-course-played-choice-options">
                <label className="portal-course-played-choice-option">
                  <input
                    type="radio"
                    name="would_play_again"
                    checked={form.would_play_again}
                    onChange={() => setForm((current) => ({ ...current, would_play_again: true }))}
                  />
                  <span>Yes</span>
                </label>
                <label className="portal-course-played-choice-option">
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

            <RoundPhotoPicker drafts={photoDrafts} onChange={setPhotoDrafts} disabled={submitting} />

            {error ? (
              <p className="portal-course-played-error" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              className="portal-btn portal-btn--gold portal-btn--full"
              disabled={submitting}
            >
              {submitting ? "Saving…" : "Save Course Played"}
            </button>
          </form>
        )}
      </article>
    </div>
  );
}
