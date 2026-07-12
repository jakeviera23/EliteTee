import { useEffect, useState } from "react";
import type { MemberProfileRecord } from "../../../types/memberProfileRecord";
import { resolveMemberMediaUrl } from "../../../lib/memberProfileMedia";

type DiscoverMemberAvatarProps = {
  member: Pick<MemberProfileRecord, "full_name" | "club_logo_url" | "cover_photo_url">;
  size?: "md" | "lg";
};

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "M";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return `${first}${last}`.toUpperCase();
}

export function DiscoverMemberAvatar({ member, size = "md" }: DiscoverMemberAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const storedPath = member.cover_photo_url?.trim() || member.club_logo_url?.trim() || "";

  useEffect(() => {
    let active = true;
    setImageFailed(false);

    if (!storedPath) {
      setResolvedUrl(null);
      return () => {
        active = false;
      };
    }

    void resolveMemberMediaUrl(storedPath).then((url) => {
      if (active) setResolvedUrl(url);
    });

    return () => {
      active = false;
    };
  }, [storedPath]);

  const showImage = Boolean(resolvedUrl) && !imageFailed;

  return (
    <span className={`et-discover-avatar et-discover-avatar--${size}`} aria-hidden="true">
      {showImage ? (
        <img
          src={resolvedUrl ?? undefined}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="et-discover-avatar-monogram">{initialsFromName(member.full_name)}</span>
      )}
    </span>
  );
}
