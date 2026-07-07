import { FormEvent, useRef, useState } from "react";
import type { FeedPost, PortalGolfer, RoundType } from "../../data/portalSocial";
import { MAX_RATING, ratingOptions, roundTypeOptions } from "../../data/portalSocial";
import { photos } from "../../assets/photos";
import { FeedAvatar } from "./FeedAvatar";

type FeedComposerProps = {
  author: PortalGolfer;
  onPost: (post: FeedPost) => void;
  id?: string;
};

export function FeedComposer({ author, onPost, id }: FeedComposerProps) {
  const [expanded, setExpanded] = useState(false);
  const [caption, setCaption] = useState("");
  const [courseName, setCourseName] = useState("");
  const [location, setLocation] = useState("");
  const [playedWith, setPlayedWith] = useState("");
  const [rating, setRating] = useState(String(MAX_RATING));
  const [roundType, setRoundType] = useState<RoundType>("Casual Round");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputId = id ? `${id}-photo` : "feed-composer-photo";

  function reset() {
    setCaption("");
    setCourseName("");
    setLocation("");
    setPlayedWith("");
    setRating(String(MAX_RATING));
    setRoundType("Casual Round");
    setPhotoPreview(null);
    setExpanded(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!caption.trim() || !courseName.trim()) return;

    const newPost: FeedPost = {
      id: `post-${Date.now()}`,
      postType: roundType === "Bucket List" ? "bucket-list" : "played-today",
      author,
      courseName: courseName.trim(),
      courseLocation: location.trim() || "Location not set",
      images: [photoPreview ?? photos.swingHorizon],
      imageAlt: `Round at ${courseName.trim()}`,
      caption: caption.trim(),
      likes: 0,
      comments: 0,
      timestamp: "Just now",
      roundType,
      playedWith: playedWith.trim() || undefined,
      rating: Number(rating),
    };

    onPost(newPost);
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
          <input
            className="feed-composer-caption"
            type="text"
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            placeholder="What made this round memorable?"
            autoFocus
            required
          />
        ) : (
          <button
            type="button"
            className="feed-composer-trigger"
            onClick={() => setExpanded(true)}
          >
            Share a round from your latest game…
          </button>
        )}
        {!expanded ? (
          <span className="feed-composer-bar-hint" aria-hidden="true">
            Share Round
          </span>
        ) : null}
      </div>

      {expanded ? (
        <div className="feed-composer-expand">
          <div className="feed-composer-grid">
            <label className="feed-composer-field">
              <span>Course</span>
              <input
                type="text"
                value={courseName}
                onChange={(event) => setCourseName(event.target.value)}
                placeholder="Course name"
                required
              />
            </label>
            <label className="feed-composer-field">
              <span>Location</span>
              <input
                type="text"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="City or region"
              />
            </label>
            <label className="feed-composer-field">
              <span>Rating</span>
              <select value={rating} onChange={(event) => setRating(event.target.value)}>
                {ratingOptions.map((value) => (
                  <option key={value} value={value}>
                    {value} / {MAX_RATING}
                  </option>
                ))}
              </select>
            </label>
            <label className="feed-composer-field">
              <span>Round type</span>
              <select
                value={roundType}
                onChange={(event) => setRoundType(event.target.value as RoundType)}
              >
                {roundTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="feed-composer-field feed-composer-field--wide">
              <span>Played with</span>
              <input
                type="text"
                value={playedWith}
                onChange={(event) => setPlayedWith(event.target.value)}
                placeholder="Partners (optional)"
              />
            </label>
          </div>

          <div className="feed-composer-footer">
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
                  <img src={photoPreview} alt="Selected round photo" />
                ) : (
                  <span>+ Photo</span>
                )}
              </label>
            </div>
            <div className="feed-composer-footer-actions">
              <button
                type="button"
                className="feed-composer-cancel"
                onClick={reset}
              >
                Cancel
              </button>
              <button type="submit" className="portal-btn portal-btn--gold portal-btn--compact">
                Share Round
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}
