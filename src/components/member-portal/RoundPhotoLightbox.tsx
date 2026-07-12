import { useCallback, useEffect, useRef, useState } from "react";
import { formatPlayedOnDate } from "../../lib/memberCourseRounds";
import { getCurrentAuthUserId } from "../../lib/authUserLinking";
import { createSignedPhotoUrl, deleteOwnCourseRoundPhoto } from "../../lib/memberCourseRoundPhotos";
import { memberFacingPortalError } from "../../lib/portalErrorDisplay";
import type { MemberCourseRoundPhotoRecord } from "../../types/memberCourseRoundPhoto";

type RoundPhotoLightboxProps = {
  photos: MemberCourseRoundPhotoRecord[];
  initialIndex?: number;
  onClose: () => void;
  allowDelete?: boolean;
  onPhotoDeleted?: (photoId: string) => void;
};

function useStateClamped(initialIndex: number, length: number) {
  const safeInitial = length > 0 ? Math.min(Math.max(initialIndex, 0), length - 1) : 0;
  const [index, setIndex] = useState<number>(safeInitial);

  useEffect(() => {
    setIndex((current) => {
      if (length <= 0) return 0;
      return Math.min(Math.max(current, 0), length - 1);
    });
  }, [length]);

  return [index, setIndex] as const;
}

export function RoundPhotoLightbox({
  photos,
  initialIndex = 0,
  onClose,
  allowDelete = false,
  onPhotoDeleted,
}: RoundPhotoLightboxProps) {
  const [index, setIndex] = useStateClamped(initialIndex, photos.length);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const touchStartX = useRef<number | null>(null);
  const photo = photos[index];

  useEffect(() => {
    if (!allowDelete) return;
    void getCurrentAuthUserId().then(({ userId }) => setCurrentUserId(userId));
  }, [allowDelete]);

  useEffect(() => {
    setDeleteError(null);
    setImageUrl(photo?.signed_url ?? null);
  }, [photo]);

  const goPrev = useCallback(() => {
    setIndex((current) => (current > 0 ? current - 1 : photos.length - 1));
  }, [photos.length, setIndex]);

  const goNext = useCallback(() => {
    setIndex((current) => (current < photos.length - 1 ? current + 1 : 0));
  }, [photos.length, setIndex]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "ArrowLeft") {
        goPrev();
      } else if (event.key === "ArrowRight") {
        goNext();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [goNext, goPrev, onClose]);

  async function handleImageError() {
    if (!photo?.storage_path) return;
    const { url } = await createSignedPhotoUrl(photo.storage_path);
    setImageUrl(url);
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

    setIndex((current) => (current >= photos.length - 1 ? current - 1 : current));
  }

  if (!photo) {
    return null;
  }

  const canDelete = allowDelete && currentUserId === photo.user_id && Boolean(photo.id);

  return (
    <div
      className="round-photo-lightbox-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Course photo gallery"
      onClick={onClose}
    >
      <div className="round-photo-lightbox" onClick={(event) => event.stopPropagation()}>
        <header className="round-photo-lightbox-head">
          <div className="round-photo-lightbox-head-copy">
            <p className="round-photo-lightbox-counter">
              {index + 1} / {photos.length}
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
            touchStartX.current = event.changedTouches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            const startX = touchStartX.current;
            const endX = event.changedTouches[0]?.clientX ?? null;
            touchStartX.current = null;
            if (startX === null || endX === null) return;
            const delta = endX - startX;
            if (Math.abs(delta) < 40) return;
            if (delta > 0) goPrev();
            else goNext();
          }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={photo.caption?.trim() || "Course round photo"}
              className="round-photo-lightbox-image"
              loading="eager"
              decoding="async"
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
              <button type="button" className="round-photo-lightbox-nav-btn" onClick={goPrev}>
                Previous
              </button>
              <button type="button" className="round-photo-lightbox-nav-btn" onClick={goNext}>
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
    </div>
  );
}
