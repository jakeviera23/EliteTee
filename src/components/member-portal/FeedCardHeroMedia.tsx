import { useMemo, useState } from "react";
import type { FeedMediaItem } from "../../data/portalSocial";
import type { MemberCourseRoundPhotoRecord } from "../../types/memberCourseRoundPhoto";
import { feedListPhotoMoreCount, orderPhotosWithCoverFirst } from "../../lib/courseRoundCoverPhoto";
import { formatCourseRatingDisplay } from "../../lib/courseRating";
import {
  buildRoundMediaItems,
  fetchCoverPhotoIdsForRoundIds,
  fetchPhotosForRoundIds,
  isRoundMediaVideo,
} from "../../lib/memberCourseRoundPhotos";
import { RoundPhotoLightbox } from "./RoundPhotoLightbox";

type FeedCardHeroMediaProps = {
  photos?: MemberCourseRoundPhotoRecord[];
  mediaItems?: FeedMediaItem[];
  memberCourseRoundId?: string;
  totalPhotoCount?: number;
  imageAlt?: string;
  rating?: number;
  maxRating?: number;
  variant?: "hero" | "editorial";
};

function toMediaItems(
  photos: MemberCourseRoundPhotoRecord[] | undefined,
  mediaItems: FeedMediaItem[] | undefined,
): FeedMediaItem[] {
  if (mediaItems && mediaItems.length > 0) {
    return mediaItems.filter((item) => item.url);
  }
  return (photos ?? [])
    .filter((photo) => photo.signed_url)
    .map((photo) => ({
      id: photo.id,
      url: photo.signed_url as string,
      kind: isRoundMediaVideo(photo) ? "video" : "image",
      posterUrl: photo.poster_signed_url ?? null,
      mimeType: photo.mime_type ?? null,
      caption: photo.caption ?? null,
    }));
}

function mediaItemsToLightboxPhotos(items: FeedMediaItem[]): MemberCourseRoundPhotoRecord[] {
  return items.map((item, index) => ({
    id: item.id,
    member_course_round_id: "",
    user_id: "",
    storage_path: "",
    sort_order: index,
    is_featured: false,
    moderation_status: "active",
    created_at: "",
    signed_url: item.kind === "video" ? item.posterUrl || item.url : item.url,
    caption: item.caption,
    media_kind: item.kind,
    mime_type: item.mimeType,
    poster_signed_url: item.posterUrl,
  }));
}

export function FeedCardHeroMedia({
  photos,
  mediaItems,
  memberCourseRoundId,
  totalPhotoCount,
  imageAlt = "Post photo",
  rating,
  maxRating = 10,
  variant = "hero",
}: FeedCardHeroMediaProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [galleryMedia, setGalleryMedia] = useState<FeedMediaItem[] | null>(null);

  const visibleMedia = useMemo(() => toMediaItems(photos, mediaItems), [photos, mediaItems]);
  const lightboxMedia = galleryMedia ?? visibleMedia;
  const lightboxPhotos = useMemo(
    () => mediaItemsToLightboxPhotos(lightboxMedia),
    [lightboxMedia],
  );

  const galleryPhotoCount = totalPhotoCount ?? visibleMedia.length;
  const moreCount = feedListPhotoMoreCount(galleryPhotoCount);
  const showMoreBadge = moreCount !== null && visibleMedia.length <= 1;

  const ratingDisplay = formatCourseRatingDisplay(rating);

  if (visibleMedia.length === 0) {
    return null;
  }

  const lead = visibleMedia[0];
  const extraCount = visibleMedia.length - 1;
  const showThumbStrip = extraCount > 0 && extraCount <= 3;
  const thumbMedia = showThumbStrip ? visibleMedia.slice(1) : [];

  async function openLightbox(index: number) {
    setLightboxIndex(index);

    const roundId = memberCourseRoundId?.trim();
    if (!roundId) return;

    const [{ data: photosForRound }, { data: coverPhotoIds }] = await Promise.all([
      fetchPhotosForRoundIds([roundId]),
      fetchCoverPhotoIdsForRoundIds([roundId]),
    ]);

    const ordered = orderPhotosWithCoverFirst(
      photosForRound ?? [],
      coverPhotoIds?.get(roundId),
    );
    setGalleryMedia(buildRoundMediaItems(ordered, coverPhotoIds?.get(roundId)));
  }

  function closeLightbox() {
    setLightboxIndex(null);
  }

  return (
    <>
      <div
        className={`feed-card-hero-media feed-card-hero-media--${variant}${
          thumbMedia.length ? " feed-card-hero-media--has-thumbs" : ""
        }`}
      >
        <button
          type="button"
          className="feed-card-hero-lead"
          onClick={() => void openLightbox(0)}
          aria-label={
            lead.kind === "video"
              ? galleryPhotoCount > 1
                ? `Play video 1 of ${galleryPhotoCount}. ${galleryPhotoCount - 1} more media available.`
                : "Play video"
              : galleryPhotoCount > 1
                ? `View photo 1 of ${galleryPhotoCount}. ${galleryPhotoCount - 1} more photo${
                    galleryPhotoCount - 1 === 1 ? "" : "s"
                  } available.`
                : "View photo"
          }
        >
          {lead.kind === "video" ? (
            <video
              className="feed-card-hero-video"
              src={lead.url}
              poster={lead.posterUrl ?? undefined}
              muted
              playsInline
              preload="metadata"
              controls
              onClick={(event) => event.stopPropagation()}
            />
          ) : (
            <img
              src={lead.url}
              alt={lead.caption?.trim() || imageAlt}
              loading="lazy"
              decoding="async"
            />
          )}
          <span className="feed-card-hero-scrim" aria-hidden="true" />
          {showMoreBadge ? (
            <span className="feed-card-hero-more" aria-hidden="true">
              +{moreCount}
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

        {thumbMedia.length ? (
          <div className="feed-card-hero-thumbs" role="list" aria-label="Additional media">
            {thumbMedia.map((item, index) => {
              const photoIndex = index + 1;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="listitem"
                  className="feed-card-hero-thumb"
                  onClick={() => void openLightbox(photoIndex)}
                  aria-label={
                    item.kind === "video"
                      ? `View video ${photoIndex + 1} of ${visibleMedia.length}`
                      : `View photo ${photoIndex + 1} of ${visibleMedia.length}`
                  }
                >
                  {item.kind === "video" ? (
                    <video
                      src={item.url}
                      poster={item.posterUrl ?? undefined}
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <img src={item.url} alt="" loading="lazy" />
                  )}
                  {item.kind === "video" ? (
                    <span className="feed-card-hero-thumb-video-label">Video</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {lightboxIndex !== null ? (
        <RoundPhotoLightbox
          key={`feed-lightbox-${lightboxIndex}-${lightboxPhotos.length}`}
          photos={lightboxPhotos}
          initialIndex={lightboxIndex}
          onClose={closeLightbox}
        />
      ) : null}
    </>
  );
}
