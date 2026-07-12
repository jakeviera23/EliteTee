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
import { memberFacingPortalError } from "../../lib/portalErrorDisplay";
import { fetchMemberCourseRoundById } from "../../lib/memberCourseRounds";
import { fetchGolfCourseById } from "../../lib/golfCourses";
import {
  canMemberEditMemberSubmittedCourseLocation,
  resolveEditableCourseLocation,
} from "../../lib/memberSubmittedCourseLocation";
import { getCurrentAuthUserId } from "../../lib/authUserLinking";
import type { GolfCourseSearchResult } from "../../types/golfCourse";
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
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");
  const [playedOn, setPlayedOn] = useState(post.playedOn ?? "");
  const [wouldPlayAgain, setWouldPlayAgain] = useState(post.wouldPlayAgain ?? true);
  const [courseRating, setCourseRating] = useState<number | null>(post.rating ?? 10);
  const [linkedCourse, setLinkedCourse] = useState<GolfCourseSearchResult | null>(null);
  const [showStructuredLocation, setShowStructuredLocation] = useState(false);
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

    void (async () => {
      const [{ data: round, error: roundError }, { userId }] = await Promise.all([
        fetchMemberCourseRoundById(post.memberCourseRoundId as string),
        getCurrentAuthUserId(),
      ]);

      if (!active) return;

      if (roundError || !round) {
        setIsLoadingRound(false);
        return;
      }

      setMessage(round.note || defaults.message);
      setLocation(round.location);
      setPlayedOn(round.played_on);
      setWouldPlayAgain(round.would_play_again);
      setCourseRating(round.course_rating);

      if (!round.golf_course_id) {
        const parsed = resolveEditableCourseLocation({ roundLocation: round.location });
        setCity(parsed.city);
        setRegion(parsed.region);
        setCountry(parsed.country || "United States");
        setShowStructuredLocation(false);
        setIsLoadingRound(false);
        return;
      }

      const { data: course } = await fetchGolfCourseById(round.golf_course_id);
      if (!active) return;

      setLinkedCourse(course);
      const canEditStructured = canMemberEditMemberSubmittedCourseLocation({
        course,
        roundOwnerUserId: round.member_user_id,
        currentUserId: userId,
      });
      setShowStructuredLocation(canEditStructured);

      const parsed = resolveEditableCourseLocation({
        course,
        roundLocation: round.location,
      });
      setCity(parsed.city);
      setRegion(parsed.region);
      setCountry(parsed.country || "United States");
      setLocation(parsed.city || parsed.region || parsed.country ? round.location : defaults.location);
      setIsLoadingRound(false);
    })();

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
        setError(memberFacingPortalError(saveError?.message ?? "unknown", "feed"));
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
      city: showStructuredLocation ? city : undefined,
      region: showStructuredLocation ? region : undefined,
      country: showStructuredLocation ? country : undefined,
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
      city: showStructuredLocation ? city : undefined,
      region: showStructuredLocation ? region : undefined,
      country: showStructuredLocation ? country : undefined,
    });
    setIsSaving(false);

    if (saveError || !data) {
      setError(memberFacingPortalError(saveError?.message ?? "unknown", "feed"));
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
            {editMode === "course-round" ? "Edit experience" : "Edit post"}
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
              {showStructuredLocation ? (
                <>
                  <p className="feed-edit-field-hint">
                    Correct the directory location for this community-added course. This updates the
                    course library grouping for {linkedCourse?.name ?? "your experience"}.
                  </p>
                  <label className="feed-edit-field">
                    <span>City</span>
                    <input
                      type="text"
                      value={city}
                      onChange={(event) => setCity(event.target.value)}
                      required
                      disabled={isSaving || isLoadingRound}
                    />
                  </label>
                  <label className="feed-edit-field">
                    <span>State / Region</span>
                    <input
                      type="text"
                      value={region}
                      onChange={(event) => setRegion(event.target.value)}
                      required
                      disabled={isSaving || isLoadingRound}
                    />
                  </label>
                  <label className="feed-edit-field">
                    <span>Country</span>
                    <input
                      type="text"
                      value={country}
                      onChange={(event) => setCountry(event.target.value)}
                      required
                      disabled={isSaving || isLoadingRound}
                    />
                  </label>
                </>
              ) : (
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
              )}

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
