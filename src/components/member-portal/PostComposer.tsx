import { FormEvent, useRef, useState } from "react";
import type { FeedPost, PortalGolfer, RoundType } from "../../data/portalSocial";
import { MAX_RATING, ratingOptions, roundTypeOptions } from "../../data/portalSocial";
import { photos } from "../../assets/photos";

type PostComposerProps = {
  author: PortalGolfer;
  onPost: (post: FeedPost) => void;
  id?: string;
};

export function PostComposer({ author, onPost, id }: PostComposerProps) {
  const [caption, setCaption] = useState("");
  const [courseName, setCourseName] = useState("");
  const [location, setLocation] = useState("");
  const [playedWith, setPlayedWith] = useState("");
  const [rating, setRating] = useState(String(MAX_RATING));
  const [showMore, setShowMore] = useState(false);
  const [roundType, setRoundType] = useState<RoundType>("Casual Round");
  const [weather, setWeather] = useState("");
  const [score, setScore] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputId = id ? `${id}-photo` : "composer-photo-upload";

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setPhotoPreview(null);
      return;
    }
    setPhotoPreview(URL.createObjectURL(file));
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
      imageAlt: `Golf post at ${courseName.trim()}`,
      caption: caption.trim(),
      likes: 0,
      comments: 0,
      timestamp: "Just now",
      roundType,
      playedWith: playedWith.trim() || undefined,
      rating: Number(rating),
      weather: weather.trim() || undefined,
      score: score.trim() || undefined,
    };

    onPost(newPost);
    setCaption("");
    setCourseName("");
    setLocation("");
    setPlayedWith("");
    setRoundType("Casual Round");
    setRating(String(MAX_RATING));
    setWeather("");
    setScore("");
    setShowMore(false);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <form id={id} className="portal-composer portal-composer--inline" onSubmit={handleSubmit}>
      <h3 className="portal-composer-title">What did you play today?</h3>

      <div className="portal-composer-inline-grid">
        <label className="portal-composer-field">
          <span>Course</span>
          <input
            type="text"
            value={courseName}
            onChange={(event) => setCourseName(event.target.value)}
            placeholder="Course name"
            required
          />
        </label>
        <label className="portal-composer-field">
          <span>Location</span>
          <input
            type="text"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="City or region"
          />
        </label>
        <label className="portal-composer-field">
          <span>Rating</span>
          <select value={rating} onChange={(event) => setRating(event.target.value)}>
            {ratingOptions.map((value) => (
              <option key={value} value={value}>
                {value} / {MAX_RATING}
              </option>
            ))}
          </select>
        </label>
        <label className="portal-composer-field">
          <span>Played with</span>
          <input
            type="text"
            value={playedWith}
            onChange={(event) => setPlayedWith(event.target.value)}
            placeholder="Partners"
          />
        </label>
        <label className="portal-composer-field portal-composer-field--wide">
          <span>Caption</span>
          <textarea
            rows={2}
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            placeholder="Share what made this round memorable"
            required
          />
        </label>
        <div className="portal-composer-photo portal-composer-photo--inline">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="visually-hidden"
            id={photoInputId}
            onChange={handlePhotoChange}
          />
          <label htmlFor={photoInputId} className="portal-composer-photo-label">
            {photoPreview ? (
              <img src={photoPreview} alt="Selected round photo" />
            ) : (
              <span>+ Photo</span>
            )}
          </label>
        </div>
      </div>

      <div className="portal-composer-footer">
        <button
          type="button"
          className="portal-composer-more-toggle"
          aria-expanded={showMore}
          onClick={() => setShowMore((value) => !value)}
        >
          {showMore ? "Hide details" : "More details"}
        </button>
        <button type="submit" className="portal-btn portal-btn--gold portal-composer-submit">
          Share Round
        </button>
      </div>

      {showMore ? (
        <div className="portal-composer-more">
          <label className="portal-composer-field">
            <span>Round type</span>
            <select value={roundType} onChange={(event) => setRoundType(event.target.value as RoundType)}>
              {roundTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="portal-composer-field">
            <span>Weather</span>
            <input
              type="text"
              value={weather}
              onChange={(event) => setWeather(event.target.value)}
              placeholder="Sunny, light breeze"
            />
          </label>
          <label className="portal-composer-field">
            <span>Score</span>
            <input
              type="text"
              value={score}
              onChange={(event) => setScore(event.target.value)}
              placeholder="e.g. 74"
            />
          </label>
        </div>
      ) : null}
    </form>
  );
}
