import { useState } from "react";
import type { MemberProfileRecord } from "../../types/memberProfileRecord";

type MemberClubAvatarProps = {
  member: Pick<MemberProfileRecord, "club_logo_url">;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function MemberClubAvatar({
  member,
  size = "md",
  className = "",
}: MemberClubAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const logoUrl = member.club_logo_url?.trim();
  const showImage = Boolean(logoUrl) && !imageFailed;

  return (
    <span
      className={`portal-member-avatar portal-member-avatar--${size}${className ? ` ${className}` : ""}`}
      aria-hidden="true"
    >
      {showImage ? (
        <img
          src={logoUrl}
          alt=""
          onError={() => setImageFailed(true)}
          loading="lazy"
          decoding="async"
        />
      ) : null}
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
      <MemberClubAvatar member={member} size={size} />
      <div className="portal-member-identity-text">
        <HeadingTag>{member.full_name}</HeadingTag>
      </div>
    </div>
  );
}
