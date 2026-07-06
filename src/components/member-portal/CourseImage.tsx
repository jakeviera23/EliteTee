import { useState } from "react";

type CourseImageProps = {
  src: string;
  alt: string;
  className?: string;
  /** Fill a positioned parent (hero / thumbnail slots). */
  fill?: boolean;
};

export function CourseImage({ src, alt, className, fill = false }: CourseImageProps) {
  const [failed, setFailed] = useState(false);
  const classes = [fill ? "portal-course-img" : "", className].filter(Boolean).join(" ");

  if (failed || !src.trim()) {
    return (
      <div
        className={`portal-course-image-fallback${classes ? ` ${classes}` : ""}`}
        role="img"
        aria-label={alt}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={classes || undefined}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
