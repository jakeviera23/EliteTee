import { useMemo, useState } from "react";
import type { MemberCourseRoundPhotoRecord } from "../../../types/memberCourseRoundPhoto";
import { RoundPhotoLightbox } from "../RoundPhotoLightbox";

type CourseDetailGalleryProps = {
  photos: MemberCourseRoundPhotoRecord[];
};

export function CourseDetailGallery({ photos }: CourseDetailGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const visiblePhotos = useMemo(
    () => photos.filter((photo) => photo.signed_url?.trim()),
    [photos],
  );

  if (visiblePhotos.length === 0) {
    return (
      <div className="et-course-detail-empty">
        <p className="et-course-detail-empty-title">No course photos yet</p>
        <p className="et-course-detail-empty-copy">
          Official imagery and member round photos will appear here once shared.
        </p>
      </div>
    );
  }

  const leadPhoto = visiblePhotos[0]!;
  const thumbPhotos = visiblePhotos.slice(1, 5);
  const overflowCount = Math.max(visiblePhotos.length - 1 - thumbPhotos.length, 0);

  return (
    <>
      <div className="et-course-detail-gallery" data-count={visiblePhotos.length}>
        <button
          type="button"
          className="et-course-detail-gallery-lead"
          onClick={() => setLightboxIndex(0)}
          aria-label={`View course photo 1 of ${visiblePhotos.length}`}
        >
          <img
            src={leadPhoto.signed_url!}
            alt={leadPhoto.caption?.trim() || "Course photo"}
            loading="eager"
            decoding="async"
          />
        </button>

        {thumbPhotos.length > 0 ? (
          <ul className="et-course-detail-gallery-thumbs" aria-label="More course photos">
            {thumbPhotos.map((photo, index) => {
              const photoIndex = index + 1;
              const isOverflowTile =
                index === thumbPhotos.length - 1 && overflowCount > 0;

              return (
                <li key={photo.id}>
                  <button
                    type="button"
                    className="et-course-detail-gallery-thumb"
                    onClick={() => setLightboxIndex(photoIndex)}
                    aria-label={
                      isOverflowTile
                        ? `View all ${visiblePhotos.length} photos`
                        : `View course photo ${photoIndex + 1} of ${visiblePhotos.length}`
                    }
                  >
                    <img
                      src={photo.signed_url!}
                      alt={photo.caption?.trim() || "Course photo"}
                      loading="lazy"
                      decoding="async"
                    />
                    {isOverflowTile ? (
                      <span className="et-course-detail-gallery-overflow" aria-hidden="true">
                        +{overflowCount}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}

        <p className="et-course-detail-gallery-count">
          {visiblePhotos.length} photo{visiblePhotos.length === 1 ? "" : "s"}
        </p>
      </div>

      {lightboxIndex !== null ? (
        <RoundPhotoLightbox
          photos={visiblePhotos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}
    </>
  );
}
