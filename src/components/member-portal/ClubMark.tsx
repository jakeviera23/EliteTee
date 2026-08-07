import { useState } from "react";
import {
  canDisplayClubBrandAsset,
  getClubMarkInitials,
  getClubMarkTone,
  type ClubBrandRightsStatus,
} from "../../lib/clubBranding";

type ClubMarkProps = {
  name: string;
  assetUrl?: string | null;
  rightsStatus?: ClubBrandRightsStatus | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function ClubMark({
  name,
  assetUrl = null,
  rightsStatus = null,
  size = "md",
  className = "",
}: ClubMarkProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const mayDisplayAsset = canDisplayClubBrandAsset(assetUrl, rightsStatus) && !imageFailed;
  const tone = getClubMarkTone(name);

  return (
    <span
      className={`et-club-mark et-club-mark--${size} et-club-mark--tone-${tone}${
        className ? ` ${className}` : ""
      }`}
      aria-hidden="true"
    >
      {mayDisplayAsset ? (
        <img
          src={assetUrl?.trim()}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="et-club-mark-monogram">{getClubMarkInitials(name)}</span>
      )}
    </span>
  );
}
