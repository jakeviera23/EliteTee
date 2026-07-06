import { SafeImage } from "../SafeImage";

type CourseImageProps = {
  src: string;
  alt: string;
  className?: string;
  objectPosition?: string;
  /** Fill a positioned parent (hero / thumbnail slots). */
  fill?: boolean;
};

/** Local approved assets — see src/assets/photos.ts. */
export function CourseImage({
  src,
  alt,
  className,
  objectPosition = "center 50%",
  fill = false,
}: CourseImageProps) {
  return (
    <SafeImage
      src={src}
      alt={alt}
      objectPosition={objectPosition}
      fill={fill}
      className={className}
      fallbackClassName="portal-course-image-fallback"
      loading="lazy"
      decoding="async"
    />
  );
}
