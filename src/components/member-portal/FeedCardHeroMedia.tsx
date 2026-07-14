import { useMemo, useState } from "react";
import type { MemberCourseRoundPhotoRecord } from "../../types/memberCourseRoundPhoto";
import { formatCourseRatingDisplay } from "../../lib/courseRating";
import { RoundPhotoLightbox } from "./RoundPhotoLightbox";

type FeedCardHeroMediaProps = {
  photos: MemberCourseRoundPhotoRecord[];
  imageAlt?: string;
  rating?: number;
  maxRating?: number;
  variant?: "hero" | "editorial";
};

export function FeedCardHeroMedia({
  photos,
  imageAlt = "Post photo",
  rating,
  maxRating = 10,
  variant = "hero",
}: FeedCardHeroMediaProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const visiblePhotos = useMemo(
    () => photos.filter((photo) => photo.signed_url),
    [photos],
  );

  const ratingDisplay = formatCourseRatingDisplay(rating);

  if (visiblePhotos.length === 0) {
    return null;
  }

  const leadPhoto = visiblePhotos[0];
  const extraCount = visiblePhotos.length - 1;
  const showThumbStrip = extraCount > 0 && extraCount <= 3;
  const thumbPhotos = showThumbStrip ? visiblePhotos.slice(1) : [];
  const showOverflowOnLead = extraCount > 3;

  function openLightbox(index: number) {
    setLightboxIndex(index);
  }

  return (
    <>
      <div
        className={`feed-card-hero-media feed-card-hero-media--${variant}${
          thumbPhotos.length ? " feed-card-hero-media--has-thumbs" : ""
        }`}
      >
        <button
          type="button"
          className="feed-card-hero-lead"
          onClick={() => openLightbox(0)}
          aria-label={
            extraCount > 0
              ? `View photo 1 of ${visiblePhotos.length}. ${extraCount} more photo${
                  extraCount === 1 ? "" : "s"
                } available.`
              : "View photo"
          }
        >
          <img
            src={leadPhoto.signed_url!}
            alt={leadPhoto.caption?.trim() || imageAlt}
            loading="lazy"
            decoding="async"
          />
          <span className="feed-card-hero-scrim" aria-hidden="true" />
          {showOverflowOnLead ? (
            <span className="feed-card-hero-more" aria-hidden="true">
              +{extraCount}
            </span>
          ) : null}
          {variant === "hero" && ratingDisplay ? (
            <span
              className="feed-card-rating feed-card-rating--overlay"
              aria-label={`Member rating ${ratingDisplay} out of ${maxRating.toFixed(1)}`}
            >
              <span className="feed-card-rating-value">{ratingDisplay}</span>
              <span className="feed-card-rating-label">Member rating</span>
            </span>
          ) : null}
        </button>

        {thumbPhotos.length ? (
          <div className="feed-card-hero-thumbs" role="list" aria-label="Additional photos">
            {thumbPhotos.map((photo, index) => {
              const photoIndex = index + 1;
              const isLast = index === thumbPhotos.length - 1;
              const hiddenCount = visiblePhotos.length - 1 - thumbPhotos.length;

              return (
                <button
                  key={photo.id}
                  type="button"
                  role="listitem"
                  className="feed-card-hero-thumb"
                  onClick={() => openLightbox(photoIndex)}
                  aria-label={`View photo ${photoIndex + 1} of ${visiblePhotos.length}`}
                >
                  <img
                    src={photo.signed_url!}
                    alt={photo.caption?.trim() || `Photo ${photoIndex + 1}`}
                    loading="lazy"
                    decoding="async"
                  />
                  {isLast && hiddenCount > 0 ? (
                    <span className="feed-card-hero-more feed-card-hero-more--thumb" aria-hidden="true">
                      +{hiddenCount}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {lightboxIndex !== null ? (
        <RoundPhotoLightbox
          key={`feed-lightbox-${lightboxIndex}`}
          photos={visiblePhotos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}
    </>
  );
}
