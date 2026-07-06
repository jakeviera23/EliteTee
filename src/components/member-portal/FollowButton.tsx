import { useState } from "react";

type FollowButtonProps = {
  initialFollowing?: boolean;
  compact?: boolean;
  onToggle?: (following: boolean) => void;
};

export function FollowButton({ initialFollowing = false, compact = false, onToggle }: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing);

  function handleClick() {
    setFollowing((current) => {
      const next = !current;
      onToggle?.(next);
      return next;
    });
  }

  return (
    <button
      type="button"
      className={`portal-follow-btn${following ? " is-following" : ""}${compact ? " portal-follow-btn--compact" : ""}`}
      onClick={handleClick}
      aria-pressed={following}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
