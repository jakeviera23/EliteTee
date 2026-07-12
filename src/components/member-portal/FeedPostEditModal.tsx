import { FormEvent, useEffect, useId, useState } from "react";
import type { FeedPost } from "../../data/portalSocial";
import {
  deriveCourseRoundEditDefaults,
  getFeedPostEditMode,
  validateCourseRoundPostEditInput,
  validateTextPostEditInput,
} from "../../lib/feedPostEditing";
import {
  updateCourseRoundFeedPost,
  updateMemberFeedPostCaption,
} from "../../lib/memberFeedPosts";
import { fetchMemberCourseRoundById } from "../../lib/memberCourseRounds";
import { CourseRatingPicker } from "./CourseRatingPicker";

type FeedPostEditModalProps = {
  post: FeedPost;
  onClose: () => void;
  onSaved: (post: FeedPost) => void;
};

export function FeedPostEditModal({ post, onClose, onSaved }: FeedPostEditModalProps) {
  const formId = useId();
  const editMode = getFeedPostEditMode(post);
  const [message, setMessage] = useState(post.caption ?? "");
  const [location, setLocation] = useState(post.courseLocation ?? "");
  const [playedOn, setPlayedOn] = useState(post.playedOn ?? "");
  const [wouldPlayAgain, setWouldPlayAgain] = useState(post.wouldPlayAgain ?? true);
  const [courseRating, setCourseRating] = useState<number | null>(post.rating ?? 10);
  const [isLoadingRound, setIsLoadingRound] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editMode !== "course-round") return;

    const defaults = deriveCourseRoundEditDefaults(post);
    setMessage(defaults.message);
    setLocation(defaults.location);
    setPlayedOn(defaults.playedOn);
    setWouldPlayAgain(defaults.wouldPlayAgain);
    setCourseRating(defaults.courseRating);

    if (!post.memberCourseRoundId) return;

    let active = true;
    setIsLoadingRound(true);

    void fetchMemberCourseRoundById(post.memberCourseRoundId).then(({ data, error: roundError }) => {
      if (!active) return;
      setIsLoadingRound(false);

      if (roundError || !data) return;

      setMessage(data.note || defaults.message);
      setLocation(data.location);
      setPlayedOn(data.played_on);
      setWouldPlayAgain(data.would_play_again);
      setCourseRating(data.course_rating);
    });

    return () => {
      active = false;
    };
  }, [editMode, post]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSaving) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSaving, onClose]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;

    setError(null);

    if (editMode === "text") {
      const validation = validateTextPostEditInput({ message });
      if (!validation.ok) {
        setError(validation.message);
        return;
      }

      setIsSaving(true);
      const { data, error: saveError } = await updateMemberFeedPostCaption(post.id, message);
      setIsSaving(false);

      if (saveError || !data) {
        setError(saveError?.message ?? "Your post could not be saved.");
        return;
      }

      onSaved(data);
      return;
    }

    if (courseRating == null) {
      setError("Please enter a rating from 1.0 to 10.0.");
      return;
    }

    const validation = validateCourseRoundPostEditInput({
      message,
      courseRating,
      playedOn,
      wouldPlayAgain,
      location,
    });

    if (!validation.ok) {
      setError(validation.message);
      return;
    }

    setIsSaving(true);
    const { data, error: saveError } = await updateCourseRoundFeedPost(post.id, {
      message,
      courseRating,
      playedOn,
      wouldPlayAgain,
      location,
    });
    setIsSaving(false);

    if (saveError || !data) {
      setError(saveError?.message ?? "Your post could not be saved.");
      return;
    }

    onSaved(data);
  }

  return (
    <div className="feed-edit-backdrop" role="presentation" onClick={isSaving ? undefined : onClose}>
      <div
        className="feed-edit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${formId}-title`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="feed-edit-modal-head">
          <h2 id={`${formId}-title`} className="feed-edit-modal-title">
            {editMode === "course-round" ? "Edit course round" : "Edit post"}
          </h2>
          <button
            type="button"
            className="feed-edit-modal-close"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close editor"
          >
            ×
          </button>
        </header>

        <form id={formId} className="feed-edit-form" onSubmit={handleSubmit}>
          {editMode === "course-round" && isLoadingRound ? (
            <p className="feed-edit-loading" aria-live="polite">
              Loading round details…
            </p>
          ) : null}

          <label className="feed-edit-field feed-edit-field--wide">
            <span>{editMode === "course-round" ? "Review" : "Post"}</span>
            <textarea
              rows={4}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              required
              disabled={isSaving || isLoadingRound}
            />
          </label>

          {editMode === "course-round" ? (
            <>
              <label className="feed-edit-field feed-edit-field--wide">
                <span>Location</span>
                <input
                  type="text"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  required
                  disabled={isSaving || isLoadingRound}
                />
              </label>

              <label className="feed-edit-field">
                <span>Date played</span>
                <input
                  type="date"
                  value={playedOn}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(event) => setPlayedOn(event.target.value)}
                  required
                  disabled={isSaving || isLoadingRound}
                />
              </label>

              <div className="feed-edit-field feed-edit-field--wide">
                <CourseRatingPicker
                  value={courseRating}
                  onChange={setCourseRating}
                  disabled={isSaving || isLoadingRound}
                  error={error && courseRating == null ? error : null}
                />
              </div>

              <fieldset className="feed-edit-choice" disabled={isSaving || isLoadingRound}>
                <legend>Would play again?</legend>
                <div className="feed-edit-choice-options">
                  <label className="feed-edit-choice-option">
                    <input
                      type="radio"
                      name={`${formId}-would-play-again`}
                      checked={wouldPlayAgain}
                      onChange={() => setWouldPlayAgain(true)}
                    />
                    <span>Yes</span>
                  </label>
                  <label className="feed-edit-choice-option">
                    <input
                      type="radio"
                      name={`${formId}-would-play-again`}
                      checked={!wouldPlayAgain}
                      onChange={() => setWouldPlayAgain(false)}
                    />
                    <span>No</span>
                  </label>
                </div>
              </fieldset>
            </>
          ) : null}

          {error ? (
            <p className="feed-edit-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="feed-edit-actions">
            <button
              type="button"
              className="et-btn et-btn--secondary"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="et-btn et-btn--primary"
              disabled={isSaving || isLoadingRound}
            >
              {isSaving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
