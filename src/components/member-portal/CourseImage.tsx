import { useEffect, useState } from "react";
import {
  formatGolfCourseLocation,
  getGolfCourseInitials,
  resolveGolfCourseDisplayImage,
  type GolfCourseImageVariant,
} from "../../types/golfCourse";
import { fetchFeaturedCommunityPhotoUrl } from "../../lib/memberCourseRoundPhotos";
import { getCoursePhoto } from "../../assets/photos";

type CourseImageProps = {
  name: string;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  golfCourseId?: string | null;
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
  golfCourseId,
  variant = "card",
  className = "",
  overlay = false,
  loading = "lazy",
  alt = "",
}: CourseImageProps) {
  const location = formatGolfCourseLocation({ city, region, country });
  const officialUrl = resolveGolfCourseDisplayImage(
    { image_url: imageUrl, thumbnail_url: thumbnailUrl },
    variant,
  );
  const [communityUrl, setCommunityUrl] = useState<string | null>(null);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(() => new Set());
  const bundledUrl = getCoursePhoto(name);

  useEffect(() => {
    setCommunityUrl(null);
    setFailedUrls(new Set());
  }, [golfCourseId, officialUrl, name]);

  useEffect(() => {
    let active = true;

    if (
      !golfCourseId ||
      communityUrl ||
      (officialUrl && !failedUrls.has(officialUrl))
    ) {
      return () => {
        active = false;
      };
    }

    async function loadCommunityPhoto() {
      const { url } = await fetchFeaturedCommunityPhotoUrl(golfCourseId!);
      if (!active) return;
      setCommunityUrl(url);
    }

    void loadCommunityPhoto();

    return () => {
      active = false;
    };
  }, [officialUrl, golfCourseId, communityUrl, failedUrls]);

  const resolvedUrl = [officialUrl, communityUrl, bundledUrl].find(
    (url): url is string => Boolean(url) && !failedUrls.has(url!),
  );
  const showPhoto = Boolean(resolvedUrl);
  const isDestinationReference = Boolean(
    resolvedUrl && bundledUrl && resolvedUrl === bundledUrl && resolvedUrl !== officialUrl && resolvedUrl !== communityUrl,
  );

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
            alt={isDestinationReference ? "Golf destination reference photography" : alt}
            loading={loading}
            decoding="async"
            onError={() => {
              if (!resolvedUrl) return;
              setFailedUrls((current) => new Set(current).add(resolvedUrl));
            }}
          />
          {overlay ? <div className="course-image-overlay" aria-hidden="true" /> : null}
          {isDestinationReference ? (
            <span className="course-image-reference-label">Destination reference</span>
          ) : null}
        </>
      ) : (
        <CourseImagePlaceholder name={name} location={location} variant={variant} />
      )}
    </div>
  );
}
