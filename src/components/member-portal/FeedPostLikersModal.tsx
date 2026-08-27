import { useEffect, useId, useRef } from "react";
import type { FeedPostLiker } from "../../lib/feedPostEngagement";
import { FeedAvatar } from "./FeedAvatar";

type FeedPostLikersModalProps = {
  isOpen: boolean;
  isLoading: boolean;
  errorMessage: string | null;
  likers: FeedPostLiker[];
  onClose: () => void;
  onRetry: () => void;
  onViewLiker: (userId: string, memberName: string) => void;
};

export function FeedPostLikersModal({
  isOpen,
  isLoading,
  errorMessage,
  likers,
  onClose,
  onRetry,
  onViewLiker,
}: FeedPostLikersModalProps) {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="feed-edit-backdrop feed-likers-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="feed-edit-modal feed-likers-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="feed-edit-modal-head">
          <h2 id={titleId} className="feed-edit-modal-title">
            Likes
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            className="feed-edit-modal-close"
            onClick={onClose}
            aria-label="Close likes"
          >
            ×
          </button>
        </header>

        <div className="feed-likers-body">
          {isLoading ? (
            <p className="feed-likers-status" role="status">
              Loading likes…
            </p>
          ) : null}

          {!isLoading && errorMessage ? (
            <div className="feed-likers-error" role="alert">
              <p>{errorMessage}</p>
              <button type="button" className="et-btn et-btn--secondary" onClick={onRetry}>
                Try again
              </button>
            </div>
          ) : null}

          {!isLoading && !errorMessage && likers.length === 0 ? (
            <p className="feed-likers-status" role="status">
              No likes yet.
            </p>
          ) : null}

          {!isLoading && !errorMessage && likers.length > 0 ? (
            <ul className="feed-likers-list">
              {likers.map((liker) => (
                <li key={liker.userId}>
                  <button
                    type="button"
                    className="feed-likers-item"
                    onClick={() => onViewLiker(liker.userId, liker.name)}
                  >
                    <FeedAvatar name={liker.name} src={liker.avatarUrl} size="sm" />
                    <span className="feed-likers-item-text">
                      <span className="feed-likers-item-name">{liker.name}</span>
                      {liker.displayTimestamp ? (
                        <span className="feed-likers-item-time">{liker.displayTimestamp}</span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
