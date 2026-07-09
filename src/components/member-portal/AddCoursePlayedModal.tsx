import { FormEvent, useState } from "react";
import type { MemberCourseRoundInsert } from "../../types/memberCourseRound";
import { submitMemberCourseRound } from "../../lib/memberCourseRounds";

type AddCoursePlayedModalProps = {
  onClose: () => void;
  onSubmitted?: () => void;
};

const emptyForm: MemberCourseRoundInsert = {
  course_name: "",
  location: "",
  played_on: "",
  note: "",
  would_play_again: true,
};

export function AddCoursePlayedModal({ onClose, onSubmitted }: AddCoursePlayedModalProps) {
  const [form, setForm] = useState<MemberCourseRoundInsert>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.course_name.trim() || !form.location.trim() || !form.played_on) {
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error: submitError } = await submitMemberCourseRound(form);

    setSubmitting(false);

    if (submitError) {
      setError(submitError.message);
      return;
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
            <p>
              Thanks for sharing where you played. Member rounds help EliteTee&apos;s course library
              grow over time.
            </p>
            <button type="button" className="portal-btn portal-btn--gold portal-btn--full" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <form className="portal-course-played-form" onSubmit={handleSubmit}>
            <p className="portal-course-played-lead">
              Share a course you&apos;ve played. No scores or photos needed—just where, when, and how
              it felt.
            </p>

            <label className="portal-profile-field portal-profile-field--full">
              <span>Course name</span>
              <input
                type="text"
                value={form.course_name}
                onChange={(event) => setForm((current) => ({ ...current, course_name: event.target.value }))}
                required
                autoComplete="off"
              />
            </label>

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
