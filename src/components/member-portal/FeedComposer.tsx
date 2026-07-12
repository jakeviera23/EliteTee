import { FormEvent, useRef, useState } from "react";
import type { FeedPost, PortalGolfer, PostType, ComposerPostType } from "../../data/portalSocial";
import {
  MAX_RATING,
  ratingOptions,
  composerPostTypeLabels,
  composerPostTypeBadges,
  composerPostTypePlaceholders,
  composerPostTypeOrder,
  earlyStageCopy,
} from "../../data/portalSocial";
import { createMemberFeedPost } from "../../lib/memberFeedPosts";
import { FeedAvatar } from "./FeedAvatar";

type FeedComposerProps = {
  author: PortalGolfer;
  onPosted?: (post: FeedPost) => void;
  id?: string;
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
    hasPhoto: true,
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
    hasPhoto: true,
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

function defaultValuesFor(type: ComposerPostType): Record<string, string> {
  const values: Record<string, string> = { message: "" };
  for (const field of composerConfig[type].fields) {
    values[field.key] = field.type === "rating" ? String(MAX_RATING) : "";
  }
  return values;
}

export function FeedComposer({ author, onPosted, id }: FeedComposerProps) {
  const [expanded, setExpanded] = useState(false);
  const [postType, setPostType] = useState<ComposerPostType>("introduction");
  const [values, setValues] = useState<Record<string, string>>(() =>
    defaultValuesFor("introduction"),
  );
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputId = id ? `${id}-photo` : "feed-composer-photo";

  const config = composerConfig[postType];

  function reset() {
    setPostType("introduction");
    setValues(defaultValuesFor("introduction"));
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

  const messageMissing = !values.message?.trim();
  const primaryMissing = config.primaryKey
    ? !values[config.primaryKey]?.trim()
    : false;
  const canSubmit = !messageMissing && !primaryMissing && !isSubmitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    const message = values.message.trim();
    const isReview = postType === "round-review";

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
      rating: isReview ? Number(values.rating) : undefined,
      playedWith: isReview ? values.playedWith?.trim() || undefined : undefined,
    });

    setIsSubmitting(false);

    if (error) {
      console.error("[FeedComposer] post failed", error.message);
      setSubmitError(error.message);
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
          <span className="feed-composer-bar-hint" aria-hidden="true">
            New Post
          </span>
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
              {config.fields.map((field) => (
                <label key={field.key} className="feed-composer-field">
                  <span>
                    {field.label}
                    {field.optional ? " (optional)" : ""}
                  </span>
                  {field.type === "rating" ? (
                    <select
                      value={values[field.key] ?? String(MAX_RATING)}
                      onChange={(event) => updateValue(field.key, event.target.value)}
                    >
                      {ratingOptions.map((value) => (
                        <option key={value} value={value}>
                          {value} / {MAX_RATING}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={values[field.key] ?? ""}
                      onChange={(event) => updateValue(field.key, event.target.value)}
                      placeholder={field.placeholder}
                      required={!field.optional}
                    />
                  )}
                </label>
              ))}
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
            />
          </label>

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
                  Photo preview only — round photos publish with completed rounds.
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
                className="portal-btn portal-btn--gold portal-btn--compact"
                disabled={!canSubmit}
              >
                {isSubmitting ? "Posting…" : "Post to Feed"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}
