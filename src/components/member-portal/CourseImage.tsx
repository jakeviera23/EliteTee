import { useState } from "react";
import {
  formatGolfCourseLocation,
  getGolfCourseInitials,
  resolveGolfCourseDisplayImage,
  type GolfCourseImageVariant,
} from "../../types/golfCourse";

type CourseImageProps = {
  name: string;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  variant?: GolfCourseImageVariant;
  className?: string;
  overlay?: boolean;
  loading?: "lazy" | "eager";
  /** Decorative — course name is rendered in adjacent text */
  alt?: string;
};

function CourseContour({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`course-image-contour${className ? ` ${className}` : ""}`}
      viewBox="0 0 240 120"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M0 88 C40 72, 80 96, 120 78 S200 62, 240 74 L240 120 L0 120 Z"
        fill="currentColor"
        opacity="0.14"
      />
      <path
        d="M0 98 C48 84, 96 104, 144 88 S216 76, 240 86"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.22"
      />
      <circle cx="188" cy="34" r="2.5" fill="currentColor" opacity="0.35" />
      <path
        d="M188 36.5 V52 M184 40 H192"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.35"
      />
    </svg>
  );
}

function CourseImagePlaceholder({
  name,
  location,
  variant,
}: {
  name: string;
  location: string;
  variant: GolfCourseImageVariant;
}) {
  const initials = getGolfCourseInitials(name);

  return (
    <div className={`course-image-placeholder course-image-placeholder--${variant}`}>
      <CourseContour />
      <div className="course-image-placeholder-content">
        <span className="course-image-placeholder-initials">{initials}</span>
        <span className="course-image-placeholder-name">{name}</span>
        {location ? <span className="course-image-placeholder-location">{location}</span> : null}
      </div>
    </div>
  );
}

export function CourseImage({
  name,
  city,
  region,
  country,
  imageUrl,
  thumbnailUrl,
  variant = "card",
  className = "",
  overlay = false,
  loading = "lazy",
  alt = "",
}: CourseImageProps) {
  const location = formatGolfCourseLocation({ city, region, country });
  const resolvedUrl = resolveGolfCourseDisplayImage(
    { image_url: imageUrl, thumbnail_url: thumbnailUrl },
    variant,
  );
  const [failed, setFailed] = useState(false);
  const showPhoto = Boolean(resolvedUrl) && !failed;

  return (
    <div
      className={`course-image course-image--${variant}${className ? ` ${className}` : ""}${
        showPhoto ? " course-image--photo" : " course-image--placeholder"
      }`}
    >
      {showPhoto ? (
        <>
          <img
            src={resolvedUrl!}
            alt={alt}
            loading={loading}
            decoding="async"
            onError={() => setFailed(true)}
          />
          {overlay ? <div className="course-image-overlay" aria-hidden="true" /> : null}
        </>
      ) : (
        <CourseImagePlaceholder name={name} location={location} variant={variant} />
      )}
    </div>
  );
}
