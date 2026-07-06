import { useComingSoon } from "./ComingSoonProvider";

type FollowButtonProps = {
  initialFollowing?: boolean;
  compact?: boolean;
  onToggle?: (following: boolean) => void;
};

export function FollowButton({ compact = false }: FollowButtonProps) {
  const { showComingSoon } = useComingSoon();

  return (
    <button
      type="button"
      className={`portal-follow-btn${compact ? " portal-follow-btn--compact" : ""}`}
      onClick={() => showComingSoon("Follow")}
      aria-pressed={false}
    >
      Follow
    </button>
  );
}
