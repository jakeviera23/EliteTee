import { useState, type CSSProperties, type ImgHTMLAttributes } from "react";

type SafeImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string;
  alt: string;
  objectPosition?: string;
  /** Fill a positioned parent (absolute inset). */
  fill?: boolean;
  fallbackClassName?: string;
};

export function SafeImage({
  src,
  alt,
  objectPosition = "center center",
  fill = false,
  className,
  fallbackClassName,
  style,
  ...rest
}: SafeImageProps) {
  const [failed, setFailed] = useState(false);
  const missing = failed || !src.trim();

  const imageStyle: CSSProperties = {
    objectFit: "cover",
    objectPosition,
    ...style,
  };

  if (missing) {
    const classes = [
      fill ? "site-image site-image--fill site-image--fallback" : "site-image site-image--fallback",
      fallbackClassName,
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return <div className={classes} role="img" aria-label={alt} style={imageStyle} />;
  }

  return (
    <img
      {...rest}
      src={src}
      alt={alt}
      className={[fill ? "site-image site-image--fill" : "site-image", className].filter(Boolean).join(" ") || undefined}
      style={imageStyle}
      onError={() => setFailed(true)}
    />
  );
}
