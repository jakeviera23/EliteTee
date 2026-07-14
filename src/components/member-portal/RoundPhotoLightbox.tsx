import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { formatPlayedOnDate } from "../../lib/memberCourseRounds";
import { getCurrentAuthUserId } from "../../lib/authUserLinking";
import { createSignedPhotoUrl, deleteOwnCourseRoundPhoto } from "../../lib/memberCourseRoundPhotos";
import { memberFacingPortalError } from "../../lib/portalErrorDisplay";
import {
  clampPhotoGalleryIndex,
  getPhotoGalleryNavigation,
} from "../../lib/roundPhotoLightboxState";
import type { MemberCourseRoundPhotoRecord } from "../../types/memberCourseRoundPhoto";

type RoundPhotoLightboxProps = {
  photos: MemberCourseRoundPhotoRecord[];
  initialIndex?: number;
  onClose: () => void;
  allowDelete?: boolean;
  onPhotoDeleted?: (photoId: string) => void;
};

function lockBodyScroll() {
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  const previousOverflow = document.body.style.overflow;
  const previousPaddingRight = document.body.style.paddingRight;

  document.body.style.overflow = "hidden";
  if (scrollbarWidth > 0) {
    document.body.style.paddingRight = `${scrollbarWidth}px`;
  }

  return () => {
    document.body.style.overflow = previousOverflow;
    document.body.style.paddingRight = previousPaddingRight;
  };
}

export function RoundPhotoLightbox({
  photos,
  initialIndex = 0,
  onClose,
  allowDelete = false,
  onPhotoDeleted,
}: RoundPhotoLightboxProps) {
  const [index, setIndex] = useState(() => clampPhotoGalleryIndex(initialIndex, photos.length));
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [imageUrlOverride, setImageUrlOverride] = useState<string | null>(null);

  const safeIndex = clampPhotoGalleryIndex(index, photos.length);
  const photo = photos[safeIndex];
  const navigation = getPhotoGalleryNavigation(safeIndex, photos.length);
  const imageUrl = imageUrlOverride ?? photo?.signed_url ?? null;

  useEffect(() => {
    if (!allowDelete) return;
    void getCurrentAuthUserId().then(({ userId }) => setCurrentUserId(userId));
  }, [allowDelete]);

  useEffect(() => {
    setDeleteError(null);
    setImageUrlOverride(null);
  }, [safeIndex, photo?.id]);

  const goPrev = useCallback(() => {
    setIndex((current) => {
      const nextIndex = getPhotoGalleryNavigation(current, photos.length).prevIndex;
      return nextIndex ?? current;
    });
  }, [photos.length]);

  const goNext = useCallback(() => {
    setIndex((current) => {
      const nextIndex = getPhotoGalleryNavigation(current, photos.length).nextIndex;
      return nextIndex ?? current;
    });
  }, [photos.length]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === "ArrowLeft" && navigation.canGoPrev) {
        event.preventDefault();
        goPrev();
        return;
      }

      if (event.key === "ArrowRight" && navigation.canGoNext) {
        event.preventDefault();
        goNext();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const unlockBodyScroll = lockBodyScroll();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      unlockBodyScroll();
    };
  }, [goNext, goPrev, navigation.canGoNext, navigation.canGoPrev, onClose]);

  async function handleImageError() {
    if (!photo?.storage_path) return;
    const { url } = await createSignedPhotoUrl(photo.storage_path);
    setImageUrlOverride(url);
  }

  async function handleDelete() {
    if (!photo || !allowDelete || deleting) return;

    setDeleting(true);
    setDeleteError(null);

    const { error } = await deleteOwnCourseRoundPhoto(photo);
    setDeleting(false);

    if (error) {
      setDeleteError(memberFacingPortalError(error.message, "general"));
      return;
    }

    onPhotoDeleted?.(photo.id);

    if (photos.length <= 1) {
      onClose();
      return;
    }

    setIndex((current) => clampPhotoGalleryIndex(current, photos.length - 1));
  }

  if (!photo || typeof document === "undefined") {
    return null;
  }

  const canDelete = allowDelete && currentUserId === photo.user_id && Boolean(photo.id);

  return createPortal(
    <div
      className="round-photo-lightbox-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Course photo gallery"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="round-photo-lightbox"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="round-photo-lightbox-head">
          <div className="round-photo-lightbox-head-copy">
            <p className="round-photo-lightbox-counter">
              {safeIndex + 1} / {photos.length}
            </p>
            {photo.member_name ? (
              <p className="round-photo-lightbox-member">{photo.member_name}</p>
            ) : null}
            {photo.played_on ? (
              <p className="round-photo-lightbox-date">{formatPlayedOnDate(photo.played_on)}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="round-photo-lightbox-close"
            onClick={onClose}
            aria-label="Close gallery"
          >
            ×
          </button>
        </header>

        <div
          className="round-photo-lightbox-stage"
          onTouchStart={(event) => {
            event.currentTarget.dataset.touchStartX = String(event.changedTouches[0]?.clientX ?? "");
          }}
          onTouchEnd={(event) => {
            const startX = Number(event.currentTarget.dataset.touchStartX ?? "");
            const endX = event.changedTouches[0]?.clientX ?? startX;
            delete event.currentTarget.dataset.touchStartX;
            const delta = endX - startX;
            if (Math.abs(delta) < 40) return;
            if (delta > 0 && navigation.canGoPrev) goPrev();
            if (delta < 0 && navigation.canGoNext) goNext();
          }}
        >
          {imageUrl ? (
            <img
              key={photo.id}
              src={imageUrl}
              alt={photo.caption?.trim() || "Course round photo"}
              className="round-photo-lightbox-image"
              loading="eager"
              decoding="async"
              draggable={false}
              onError={() => void handleImageError()}
            />
          ) : (
            <p className="round-photo-lightbox-missing">This photo is no longer available.</p>
          )}
        </div>

        {photo.caption?.trim() ? (
          <p className="round-photo-lightbox-caption">{photo.caption}</p>
        ) : null}

        {deleteError ? (
          <p className="round-photo-lightbox-error" role="alert">
            {deleteError}
          </p>
        ) : null}

        <div className="round-photo-lightbox-nav">
          {photos.length > 1 ? (
            <>
              <button
                type="button"
                className="round-photo-lightbox-nav-btn"
                onClick={goPrev}
                disabled={!navigation.canGoPrev}
              >
                Previous
              </button>
              <button
                type="button"
                className="round-photo-lightbox-nav-btn"
                onClick={goNext}
                disabled={!navigation.canGoNext}
              >
                Next
              </button>
            </>
          ) : null}
          {canDelete ? (
            <button
              type="button"
              className="round-photo-lightbox-delete"
              onClick={() => void handleDelete()}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete photo"}
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
