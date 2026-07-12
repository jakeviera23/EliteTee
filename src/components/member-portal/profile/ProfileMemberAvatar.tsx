type ProfileMemberAvatarProps = {
  name: string;
  imageUrl?: string | null;
  size?: "md" | "lg" | "xl";
};

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "M";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return `${first}${last}`.toUpperCase();
}

export function ProfileMemberAvatar({
  name,
  imageUrl,
  size = "xl",
}: ProfileMemberAvatarProps) {
  const resolved = imageUrl?.trim();

  return (
    <span className={`et-profile-avatar et-profile-avatar--${size}`} aria-hidden="true">
      {resolved ? (
        <img src={resolved} alt="" loading="eager" decoding="async" />
      ) : (
        <span className="et-profile-avatar-monogram">{initialsFromName(name)}</span>
      )}
    </span>
  );
}
