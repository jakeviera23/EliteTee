import { useEffect, useMemo, useState } from "react";
import type { MemberCourseRoundPhotoRecord } from "../../types/memberCourseRoundPhoto";
import { RoundPhotoLightbox } from "./RoundPhotoLightbox";

type RoundPhotoGalleryProps = {
  photos: MemberCourseRoundPhotoRecord[];
  compact?: boolean;
  maxPreview?: number;
  className?: string;
  allowDelete?: boolean;
  onPhotoDeleted?: (photoId: string) => void;
};

export function RoundPhotoGallery({
  photos,
  compact = true,
  maxPreview = 3,
  className = "",
  allowDelete = false,
  onPhotoDeleted,
}: RoundPhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [localPhotos, setLocalPhotos] = useState(photos);

  useEffect(() => {
    setLocalPhotos(photos);
  }, [photos]);

  const visiblePhotos = useMemo(
    () => localPhotos.filter((photo) => photo.signed_url),
    [localPhotos],
  );

  const previewCount = Math.min(maxPreview, visiblePhotos.length);
  const overflowCount = visiblePhotos.length - previewCount;

  if (visiblePhotos.length === 0) {
    return null;
  }

  const previewPhotos = visiblePhotos.slice(0, previewCount);

  function handlePhotoDeleted(photoId: string) {
    setLocalPhotos((current) => current.filter((photo) => photo.id !== photoId));
    onPhotoDeleted?.(photoId);

    if (visiblePhotos.length <= 1) {
      setLightboxIndex(null);
    }
  }

  return (
    <>
      <div
        className={`round-photo-gallery${compact ? " round-photo-gallery--compact" : ""}${
          className ? ` ${className}` : ""
        }`}
        data-count={visiblePhotos.length}
      >
        {previewPhotos.map((photo, index) => {
          const isOverflowTile = compact && index === previewCount - 1 && overflowCount > 0;

          return (
            <button
              key={photo.id}
              type="button"
              className="round-photo-gallery-tile"
              onClick={() => setLightboxIndex(index)}
              aria-label={
                isOverflowTile
                  ? `View all ${visiblePhotos.length} photos`
                  : `View photo ${index + 1} of ${visiblePhotos.length}`
              }
            >
              <img
                src={photo.signed_url!}
                alt={photo.caption?.trim() || "Course round photo"}
                loading="lazy"
                decoding="async"
              />
              {isOverflowTile ? (
                <span className="round-photo-gallery-overflow" aria-hidden="true">
                  +{overflowCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {lightboxIndex !== null ? (
        <RoundPhotoLightbox
          photos={visiblePhotos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          allowDelete={allowDelete}
          onPhotoDeleted={handlePhotoDeleted}
        />
      ) : null}
    </>
  );
}
