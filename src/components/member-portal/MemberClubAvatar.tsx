import { useEffect, useState } from "react";
import type { MemberProfileRecord } from "../../types/memberProfileRecord";
import { resolveMemberMediaUrl } from "../../lib/memberProfileMedia";

type MemberClubAvatarProps = {
  member: Pick<MemberProfileRecord, "club_logo_url">;
  name?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "•";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return `${first}${last}`.toUpperCase();
}

export function MemberClubAvatar({
  member,
  name = "",
  size = "md",
  className = "",
}: MemberClubAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const storedLogo = member.club_logo_url?.trim() ?? "";

  useEffect(() => {
    let active = true;
    setImageFailed(false);

    if (!storedLogo) {
      setResolvedUrl(null);
      return () => {
        active = false;
      };
    }

    void resolveMemberMediaUrl(storedLogo).then((url) => {
      if (active) {
        setResolvedUrl(url);
      }
    });

    return () => {
      active = false;
    };
  }, [storedLogo]);

  const showImage = Boolean(resolvedUrl) && !imageFailed;

  return (
    <span
      className={`portal-member-avatar feed-avatar feed-avatar--${size}${className ? ` ${className}` : ""}`}
      aria-hidden="true"
    >
      {showImage ? (
        <img
          src={resolvedUrl ?? undefined}
          alt=""
          onError={() => setImageFailed(true)}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span className="feed-avatar-monogram">{initialsFromName(name)}</span>
      )}
    </span>
  );
}

type MemberIdentityProps = {
  member: Pick<MemberProfileRecord, "club_logo_url" | "full_name">;
  size?: "sm" | "md" | "lg";
  heading?: "h2" | "h3";
  className?: string;
};

export function MemberIdentity({
  member,
  size = "md",
  heading = "h3",
  className = "",
}: MemberIdentityProps) {
  const HeadingTag = heading;

  return (
    <div className={`portal-member-identity${className ? ` ${className}` : ""}`}>
      <MemberClubAvatar member={member} name={member.full_name} size={size} />
      <div className="portal-member-identity-text">
        <HeadingTag>{member.full_name}</HeadingTag>
      </div>
    </div>
  );
}
