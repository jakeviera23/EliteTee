import { useState } from "react";

type FeedAvatarProps = {
  name: string;
  src?: string;
  size?: "sm" | "md" | "lg";
};

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "•";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return `${first}${last}`.toUpperCase();
}

export function FeedAvatar({ name, src, size = "md" }: FeedAvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <span className={`feed-avatar feed-avatar--${size}`} aria-hidden="true">
      {showImage ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="feed-avatar-monogram">{initialsFromName(name)}</span>
      )}
    </span>
  );
}
