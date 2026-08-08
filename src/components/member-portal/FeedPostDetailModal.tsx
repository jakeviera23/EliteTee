import { useRef } from "react";
import { createPortal } from "react-dom";
import type { FeedPost } from "../../data/portalSocial";
import { useDialogFocus } from "../../hooks/useDialogFocus";
import type { ContributionResponseAction } from "../../lib/contributionResponse";
import type { ViewMemberProfileHandler } from "../../types/memberProfileNavigation";
import { FeedCard } from "./FeedCard";

type FeedPostDetailModalProps = {
  post: FeedPost;
  currentUserId?: string | null;
  viewerIsAdmin?: boolean;
  onClose: () => void;
  onToast?: (message: string) => void;
  onViewAuthor?: ViewMemberProfileHandler;
  onRespondPrivately?: (
    userId: string,
    memberName: string,
    response: ContributionResponseAction,
  ) => void;
  onPostUpdated?: (post: FeedPost) => void;
};

export function FeedPostDetailModal({
  post,
  currentUserId = null,
  viewerIsAdmin = false,
  onClose,
  onToast,
  onViewAuthor,
  onRespondPrivately,
  onPostUpdated,
}: FeedPostDetailModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus({ dialogRef, onEscape: onClose });

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="portal-modal" role="presentation">
      <button
        type="button"
        className="portal-modal-backdrop"
        aria-label="Close post"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        className="portal-modal-card portal-modal-card--dossier feed-post-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Post details"
        tabIndex={-1}
      >
        <header className="feed-post-detail-head">
          <h2 className="feed-post-detail-title">Post</h2>
          <button
            type="button"
            className="portal-modal-close"
            onClick={onClose}
            aria-label="Close post"
          >
            ×
          </button>
        </header>
        <div className="portal-modal-dossier-scroll feed-post-detail-scroll">
          <FeedCard
            post={post}
            currentUserId={currentUserId}
            viewerIsAdmin={viewerIsAdmin}
            isDetailView
            onToast={onToast}
            onViewAuthor={onViewAuthor}
            onRespondPrivately={onRespondPrivately}
            onPostUpdated={onPostUpdated}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
