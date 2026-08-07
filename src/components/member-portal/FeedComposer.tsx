import { FormEvent, useEffect, useRef, useState } from "react";
import type { FeedPost, PortalGolfer, PostType, ComposerPostType } from "../../data/portalSocial";
import {
  composerPostTypeLabels,
  composerPostTypeBadges,
  composerPostTypePlaceholders,
  composerPostTypeOrder,
  earlyStageCopy,
} from "../../data/portalSocial";
import { COURSE_RATING_MAX, validateCourseRating } from "../../lib/courseRating";
import { getFeedComposerValidation } from "../../lib/feedComposerValidation";
import { createMemberFeedPost } from "../../lib/memberFeedPosts";
import { memberFacingPortalError } from "../../lib/portalErrorDisplay";
import { CourseRatingPicker } from "./CourseRatingPicker";
import { FeedAvatar } from "./FeedAvatar";

type FeedComposerProps = {
  author: PortalGolfer;
  onPosted?: (post: FeedPost) => void;
  id?: string;
  initialPostType?: ComposerPostType;
  initialMessage?: string;
  startExpanded?: boolean;
};

type FieldType = "text" | "select" | "rating";

type ComposerField = {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  optional?: boolean;
};

type ComposerTypeConfig = {
  internalPostType: PostType;
  primaryKey?: string;
  hasPhoto?: boolean;
  fields: ComposerField[];
};

const composerConfig: Record<ComposerPostType, ComposerTypeConfig> = {
  "round-review": {
    internalPostType: "course-review",
    primaryKey: "course",
    fields: [
      { key: "course", label: "Course", type: "text", placeholder: "Course name" },
      { key: "rating", label: "Rating", type: "rating" },
      { key: "playedWith", label: "Played With", type: "text", placeholder: "Optional", optional: true },
    ],
  },
  "looking-for-game": {
    internalPostType: "played-today",
    primaryKey: "location",
    fields: [
      { key: "location", label: "Club / Course", type: "text", placeholder: "Where you'd like to play" },
      { key: "dates", label: "Dates", type: "text", placeholder: "e.g. Next week" },
      { key: "players", label: "Looking For", type: "text", placeholder: "e.g. 1–2 players", optional: true },
    ],
  },
  traveling: {
    internalPostType: "golf-travel",
    primaryKey: "destination",
    fields: [
      { key: "destination", label: "Destination", type: "text", placeholder: "City or region" },
      { key: "dates", label: "Dates", type: "text", placeholder: "e.g. Sept 3–10" },
      { key: "courses", label: "Courses / Clubs", type: "text", placeholder: "Optional", optional: true },
    ],
  },
  introduction: {
    internalPostType: "played-today",
    primaryKey: "club",
    fields: [
      { key: "club", label: "Club / Course", type: "text", placeholder: "Where you'd like an introduction" },
      { key: "lookingFor", label: "Looking For", type: "text", placeholder: "e.g. A member host", optional: true },
    ],
  },
  "business-golf": {
    internalPostType: "played-today",
    primaryKey: "city",
    fields: [
      { key: "city", label: "City / Location", type: "text", placeholder: "Where" },
      { key: "dates", label: "Availability", type: "text", placeholder: "e.g. Next week", optional: true },
      { key: "industry", label: "Industry / Interests", type: "text", placeholder: "e.g. Founders, investors", optional: true },
    ],
  },
  general: {
    internalPostType: "played-today",
    fields: [],
  },
};

const detailLabels: Record<string, string> = {
  location: "Club/Course",
  club: "Club/Course",
  city: "City",
  destination: "Destination",
  dates: "Dates",
  players: "Looking for",
  lookingFor: "Looking for",
  courses: "Courses",
  industry: "Industry",
  playedWith: "Played with",
  rating: "Rating",
};

function defaultValuesFor(type: ComposerPostType, initialMessage = ""): Record<string, string> {
  const values: Record<string, string> = { message: initialMessage };
  for (const field of composerConfig[type].fields) {
    values[field.key] = field.type === "rating" ? String(COURSE_RATING_MAX) : "";
  }
  return values;
}

function parseComposerRating(value: string | undefined): number | null {
  const result = validateCourseRating(value ?? "");
  return result.ok ? result.value : null;
}

export function FeedComposer({
  author,
  onPosted,
  id,
  initialPostType = "introduction",
  initialMessage = "",
  startExpanded = false,
}: FeedComposerProps) {
  const [expanded, setExpanded] = useState(startExpanded);
  const [postType, setPostType] = useState<ComposerPostType>(initialPostType);
  const [values, setValues] = useState<Record<string, string>>(() =>
    defaultValuesFor(initialPostType, initialMessage),
  );
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputId = id ? `${id}-photo` : "feed-composer-photo";

  const config = composerConfig[postType];

  useEffect(() => {
    setPostType(initialPostType);
    setValues(defaultValuesFor(initialPostType, initialMessage));
    setPhotoPreview(null);
    setSubmitError(null);
    setExpanded(startExpanded);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [initialMessage, initialPostType, startExpanded]);

  function reset() {
    setPostType(initialPostType);
    setValues(defaultValuesFor(initialPostType));
    setPhotoPreview(null);
    setExpanded(false);
    setSubmitError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function selectType(next: ComposerPostType) {
    setPostType(next);
    setValues(defaultValuesFor(next));
    if (!composerConfig[next].hasPhoto) setPhotoPreview(null);
  }

  function updateValue(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  }

  const primaryField = config.primaryKey
    ? config.fields.find((field) => field.key === config.primaryKey)
    : undefined;

  const validation = getFeedComposerValidation({
    message: values.message ?? "",
    primaryFieldValue: config.primaryKey ? values[config.primaryKey] : undefined,
    primaryFieldLabel: primaryField?.label,
    requiresPrimaryField: Boolean(config.primaryKey),
    ratingValue: values.rating,
    requiresRating: postType === "round-review",
  });

  const canSubmit = validation.canSubmit && !isSubmitting;
  const composerMessageMetaId = id ? `${id}-message-meta` : "feed-composer-message-meta";
  const composerBlockerId = id ? `${id}-blocker` : "feed-composer-blocker";
  const composerCounterId = id ? `${id}-counter` : "feed-composer-counter";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    const message = values.message.trim();
    const isReview = postType === "round-review";
    let normalizedRating: number | undefined;

    if (isReview) {
      const ratingResult = validateCourseRating(values.rating ?? "");
      if (!ratingResult.ok) {
        setSubmitError(ratingResult.message);
        return;
      }
      normalizedRating = ratingResult.value;
    }

    const details = config.fields
      .filter((field) => field.key !== "rating" && values[field.key]?.trim())
      .map((field) => ({
        label: detailLabels[field.key] ?? field.label,
        value: values[field.key].trim(),
      }));

    const primaryValue = config.primaryKey ? values[config.primaryKey]?.trim() : "";
    const badge = composerPostTypeBadges[postType];

    setIsSubmitting(true);
    setSubmitError(null);

    const { data, error } = await createMemberFeedPost({
      composerPostType: postType,
      message,
      headline: primaryValue || composerPostTypeLabels[postType],
      badge,
      details: details.length ? details : undefined,
      internalPostType: config.internalPostType,
      rating: normalizedRating,
      playedWith: isReview ? values.playedWith?.trim() || undefined : undefined,
    });

    setIsSubmitting(false);

    if (error) {
      console.error("[FeedComposer] post failed", error.message);
      setSubmitError(memberFacingPortalError(error.message, "feed"));
      return;
    }

    if (data) {
      onPosted?.(data);
    }

    reset();
  }

  return (
    <form
      id={id}
      className={`feed-composer${expanded ? " is-expanded" : ""}`}
      onSubmit={handleSubmit}
    >
      <div className="feed-composer-bar">
        <FeedAvatar name={author.name} src={author.avatarImage} size="sm" />
        {expanded ? (
          <p className="feed-composer-title">Post to the community</p>
        ) : (
          <button
            type="button"
            className="feed-composer-trigger"
            onClick={() => setExpanded(true)}
          >
            {earlyStageCopy.composerCollapsedPlaceholder}
          </button>
        )}
        {!expanded ? (
          <button
            type="button"
            className="feed-composer-new"
            onClick={() => setExpanded(true)}
          >
            New Post
          </button>
        ) : null}
      </div>

      {expanded ? (
        <div className="feed-composer-expand">
          <div className="feed-composer-types" role="group" aria-label="Choose a post type">
            {composerPostTypeOrder.map((type) => (
              <button
                key={type}
                type="button"
                className={`feed-composer-type${postType === type ? " is-active" : ""}`}
                onClick={() => selectType(type)}
                aria-pressed={postType === type}
              >
                {composerPostTypeLabels[type]}
              </button>
            ))}
          </div>

          {config.fields.length > 0 ? (
            <div className="feed-composer-grid">
              {config.fields.map((field) =>
                field.type === "rating" ? (
                  <div
                    key={field.key}
                    className="feed-composer-field feed-composer-field--wide feed-composer-field--rating"
                  >
                    <CourseRatingPicker
                      value={parseComposerRating(values[field.key])}
                      onChange={(next) => updateValue(field.key, String(next))}
                      disabled={isSubmitting}
                    />
                  </div>
                ) : (
                  <label key={field.key} className="feed-composer-field">
                    <span>
                      {field.label}
                      {field.optional ? " (optional)" : ""}
                    </span>
                    <input
                      type="text"
                      value={values[field.key] ?? ""}
                      onChange={(event) => updateValue(field.key, event.target.value)}
                      placeholder={field.placeholder}
                      required={!field.optional}
                    />
                  </label>
                ),
              )}
            </div>
          ) : null}

          <label className="feed-composer-field feed-composer-field--wide">
            <span>Message</span>
            <textarea
              rows={3}
              value={values.message ?? ""}
              onChange={(event) => updateValue("message", event.target.value)}
              placeholder={composerPostTypePlaceholders[postType]}
              required
              autoFocus
              aria-describedby={`${composerMessageMetaId}${validation.blockerMessage ? ` ${composerBlockerId}` : ""} ${composerCounterId}`}
            />
          </label>

          <div className="feed-composer-message-meta" id={composerMessageMetaId}>
            {validation.blockerMessage ? (
              <p className="feed-composer-helper" id={composerBlockerId}>
                {validation.blockerMessage}
              </p>
            ) : null}
            <p
              className={`feed-composer-char-count${validation.canSubmit ? " is-ready" : ""}`}
              id={composerCounterId}
              aria-live="polite"
            >
              {validation.characterCounterLabel}
            </p>
          </div>

          {submitError ? (
            <p className="feed-composer-error" role="alert">
              {submitError}
            </p>
          ) : null}

          <div className="feed-composer-footer">
            {config.hasPhoto ? (
              <div className="feed-composer-photo">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="visually-hidden"
                  id={photoInputId}
                  onChange={handlePhotoChange}
                />
                <label htmlFor={photoInputId} className="feed-composer-photo-label">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Selected photo" />
                  ) : (
                    <span>+ Photo</span>
                  )}
                </label>
                <p className="feed-composer-photo-note">
                  Photos attach when you share a full round experience from Courses.
                </p>
              </div>
            ) : (
              <span className="feed-composer-footer-note">Shared with approved members only</span>
            )}
            <div className="feed-composer-footer-actions">
              <button type="button" className="feed-composer-cancel" onClick={reset}>
                Cancel
              </button>
              <button
                type="submit"
                className={`et-btn et-btn--forest feed-composer-submit${validation.canSubmit ? " feed-composer-submit--ready" : ""}${isSubmitting ? " feed-composer-submit--posting" : ""}`}
                disabled={!canSubmit || isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="feed-composer-submit-spinner" aria-hidden="true" />
                    Posting…
                  </>
                ) : (
                  "Share with members"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}
