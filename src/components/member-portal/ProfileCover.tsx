import type { ReactNode } from "react";
import { SafeImage } from "../SafeImage";

type ProfileCoverProps = {
  src: string | null | undefined;
  alt: string;
  children?: ReactNode;
  className?: string;
};

export function ProfileCover({ src, alt, children, className = "" }: ProfileCoverProps) {
  const coverSrc = src?.trim() ?? "";

  return (
    <div className={`portal-golfer-cover${className ? ` ${className}` : ""}`}>
      {coverSrc ? (
        <SafeImage
          src={coverSrc}
          alt={alt}
          objectPosition="center"
          fill
          fallbackClassName="portal-golfer-cover-fallback portal-profile-cover-placeholder"
        />
      ) : (
        <div
          className="portal-profile-cover-placeholder portal-golfer-cover-fallback"
          role="img"
          aria-label={alt}
        >
          <span className="portal-profile-cover-crest" aria-hidden="true" />
        </div>
      )}
      {children}
    </div>
  );
}
