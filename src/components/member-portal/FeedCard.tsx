import { useEffect, useMemo, useState } from "react";
import type { FeedPost, FeedPostComment } from "../../data/portalSocial";
import { MAX_RATING, postTypeLabels } from "../../data/portalSocial";
import { formatCourseRatingDisplay } from "../../lib/courseRating";
import { FEED_CARD_ICON_CLASSES } from "../../lib/feedCardScope";
import { resolveFeedCardBadgeLabel } from "../../lib/feedPostDisplay";
import { canShowFeedPostEditMenu, isFeedPostEdited, mergeFeedPostAfterEdit } from "../../lib/feedPostEditing";
import { signedUrlsToPhotoRecords } from "../../lib/memberCourseRoundPhotos";
import { deleteOwnFeedPost } from "../../lib/memberFeedPosts";
import { memberFacingPortalError } from "../../lib/portalErrorDisplay";
import { getFeedContentFlags } from "../../lib/feedContentAudit";
import {
  applyLikeToggle,
  applySaveToggle,
  canDeleteFeedPostComment,
  createFeedPostComment,
  deleteFeedPostComment,
  fetchFeedPostComments,
  formatFeedEngagementError,
  isPersistedFeedPostId,
  toggleFeedPostLike,
  toggleFeedPostSave,
} from "../../lib/feedPostEngagement";
import {
  badgeToneForPost,
  buildFeedMetaChips,
  isCourseRoundPost,
  type FeedMetaChipTone,
} from "../../lib/feedCardMeta";
import { CourseImage } from "./CourseImage";
import { FeedAvatar } from "./FeedAvatar";
import { FeedCardHeroMedia } from "./FeedCardHeroMedia";
import { FeedPostEditModal } from "./FeedPostEditModal";
import { FeedPostMenu } from "./FeedPostMenu";
import { VerifiedBadge } from "./VerifiedBadge";

type FeedCardProps = {
  post: FeedPost;
  index?: number;
  variant?: "default" | "founder";
  currentUserId?: string | null;
  viewerIsAdmin?: boolean;
  onToast?: (message: string) => void;
  onViewAuthor?: (userId: string, memberName: string) => void;
  onPostUpdated?: (post: FeedPost) => void;
  onPostDeleted?: (postId: string) => void;
};

function HeartIcon({ filled }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={FEED_CARD_ICON_CLASSES.action}>
      <path
        d="M10 16.5 3.6 10.4a3.6 3.6 0 0 1 5.1-5.1l1.3 1.3 1.3-1.3a3.6 3.6 0 1 1 5.1 5.1L10 16.5Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={FEED_CARD_ICON_CLASSES.action}>
      <path
        d="M4 4.5h12a1.5 1.5 0 0 1 1.5 1.5v6A1.5 1.5 0 0 1 16 13.5H8.5L5 16.5v-3H4A1.5 1.5 0 0 1 2.5 12V6A1.5 1.5 0 0 1 4 4.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SaveIcon({ filled }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={FEED_CARD_ICON_CLASSES.action}>
      <path
        d="M5.5 3.5h9v13l-4.5-3.2-4.5 3.2v-13Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={FEED_CARD_ICON_CLASSES.action}>
      <path
        d="M14.5 6.5a2 2 0 1 0-1.9-2.6L7.4 6.6a2 2 0 1 0 0 2.8l5.2 2.7a2 2 0 1 0 .6-1.2L8 8.2a2 2 0 0 0 0-.4l5.1-2.6a2 2 0 0 0 1.4.9Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={FEED_CARD_ICON_CLASSES.chip}>
      <path
        d="M8 1.5 5.5 4H3.5v2.2L6 9.2V14l2-1 2 1V9.2l2.5-2.9V4h-2L8 1.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={FEED_CARD_ICON_CLASSES.chip}>
      <rect x="2.5" y="3.5" width="11" height="10" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <path d="M5 2v2.5M11 2v2.5M2.5 6.5h11" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}

function chipToneClass(tone: FeedMetaChipTone): string {
  return `feed-card-meta-chip feed-card-meta-chip--${tone}`;
}

function badgeToneClass(tone: FeedMetaChipTone): string {
  return `feed-card-type-badge feed-card-type-badge--${tone}`;
}

function AuthorIdentity({
  post,
  canViewAuthor,
  onViewAuthor,
  showEditedLabel = false,
}: {
  post: FeedPost;
  canViewAuthor: boolean;
  onViewAuthor?: () => void;
  showEditedLabel?: boolean;
}) {
  const inner = (
    <>
      <FeedAvatar name={post.author.name} src={post.author.avatarImage} size="md" />
      <div className="feed-card-identity-text">
        <p className="feed-card-name">
          {post.author.name}
          {post.author.isVerified ? <VerifiedBadge label="Verified golfer" /> : null}
        </p>
        <p className="feed-card-meta">
          {post.author.title ? (
            <span className="feed-card-role">{post.author.title}</span>
          ) : post.author.homeCourse ? (
            <span className="feed-card-role">{post.author.homeCourse}</span>
          ) : null}
          {post.timestamp ? (
            <>
              {post.author.title || post.author.homeCourse ? (
                <span className="feed-card-dot" aria-hidden="true">
                  ·
                </span>
              ) : null}
              <time className="feed-card-time" dateTime={post.createdAt}>
                {post.timestamp}
              </time>
              {showEditedLabel ? (
                <>
                  <span className="feed-card-dot" aria-hidden="true">
                    ·
                  </span>
                  <span className="feed-card-edited">Edited</span>
                </>
              ) : null}
            </>
          ) : null}
        </p>
      </div>
    </>
  );

  if (canViewAuthor && onViewAuthor) {
    return (
      <button
        type="button"
        className="feed-card-identity feed-card-identity--link"
        onClick={onViewAuthor}
        aria-label={`View ${post.author.name}'s profile`}
      >
        {inner}
      </button>
    );
  }

  return <div className="feed-card-identity">{inner}</div>;
}

export function FeedCard({
  post,
  index = 0,
  variant = "default",
  currentUserId = null,
  viewerIsAdmin = false,
  onToast,
  onViewAuthor,
  onPostUpdated,
  onPostDeleted,
}: FeedCardProps) {
  const isFounder = variant === "founder";
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const engagementEnabled = !isFounder && isPersistedFeedPostId(post.id);
  const [liked, setLiked] = useState(Boolean(post.isLiked));
  const [saved, setSaved] = useState(Boolean(post.isSaved));
  const [likeCount, setLikeCount] = useState(post.likes);
  const [commentCount, setCommentCount] = useState(post.comments);
  const [showComments, setShowComments] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [comments, setComments] = useState<FeedPostComment[]>(post.feedComments ?? []);
  const [commentsLoaded, setCommentsLoaded] = useState(Boolean(post.feedComments?.length));
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [isTogglingLike, setIsTogglingLike] = useState(false);
  const [isTogglingSave, setIsTogglingSave] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  useEffect(() => {
    setLiked(Boolean(post.isLiked));
    setSaved(Boolean(post.isSaved));
    setLikeCount(post.likes);
    setCommentCount(post.comments);
    if (post.feedComments) {
      setComments(post.feedComments);
      setCommentsLoaded(true);
    }
  }, [post.comments, post.feedComments, post.isLiked, post.isSaved, post.likes]);

  async function loadComments() {
    setIsLoadingComments(true);
    setCommentsError(null);

    const { data, error } = await fetchFeedPostComments(post.id);

    if (error) {
      console.error("[FeedCard] failed to load comments", error);
      setCommentsError(formatFeedEngagementError(error));
      setIsLoadingComments(false);
      return;
    }

    setComments(data);
    setCommentsLoaded(true);
    setIsLoadingComments(false);
  }

  const isCourseRound = !isFounder && isCourseRoundPost(post);
  const canEdit =
    !isFounder &&
    canShowFeedPostEditMenu(post, { userId: currentUserId, isAdmin: viewerIsAdmin });
  const canDelete =
    !isFounder &&
    Boolean(currentUserId && post.authorUserId && post.authorUserId === currentUserId);
  const showEditedLabel = isFeedPostEdited(post.createdAt, post.updatedAt);
  const roundLabel = resolveFeedCardBadgeLabel(post) || postTypeLabels[post.postType];
  const hasMedia =
    (post.mediaItems?.length ?? 0) > 0 || (post.images?.length ?? 0) > 0;
  const photoRecords = useMemo(
    () =>
      !post.mediaItems?.length && (post.images?.length ?? 0) > 0
        ? signedUrlsToPhotoRecords(post.images, post.memberCourseRoundId ?? "")
        : [],
    [post.mediaItems, post.images, post.memberCourseRoundId],
  );
  const metaChips = buildFeedMetaChips(post);
  const badgeTone = badgeToneForPost(post);
  const entranceStyle = { animationDelay: `${Math.min(index, 9) * 55}ms` };

  const previewComment = comments[0] ?? (post.commentPreview
    ? {
        id: "preview",
        postId: post.id,
        userId: "",
        authorName: post.commentPreview.author,
        body: post.commentPreview.text,
        createdAt: "",
        displayTimestamp: "",
      }
    : undefined);

  const authorUserId = post.author.id?.trim();
  const canViewAuthor = Boolean(onViewAuthor && authorUserId);
  const contentFlags = isFounder ? [] : getFeedContentFlags(post);

  const cardKind = isFounder ? "founder" : isCourseRound ? "round" : "social";

  function handleViewAuthor() {
    if (!onViewAuthor || !authorUserId) return;
    onViewAuthor(authorUserId, post.author.name);
  }

  async function toggleLike() {
    if (!engagementEnabled || isTogglingLike) return;

    const previousLiked = liked;
    const previousCount = likeCount;
    const optimistic = applyLikeToggle({ liked, likeCount });
    setLiked(optimistic.liked);
    setLikeCount(optimistic.likeCount);
    setIsTogglingLike(true);

    const { liked: nextLiked, error } = await toggleFeedPostLike(post.id, previousLiked);

    setIsTogglingLike(false);

    if (error) {
      setLiked(previousLiked);
      setLikeCount(previousCount);
      onToast?.(formatFeedEngagementError(error));
      return;
    }

    setLiked(nextLiked);
  }

  async function toggleSave() {
    if (!engagementEnabled || isTogglingSave) return;

    const previousSaved = saved;
    const nextSaved = applySaveToggle(saved);
    setSaved(nextSaved);
    setIsTogglingSave(true);

    const { saved: persistedSaved, error } = await toggleFeedPostSave(post.id, previousSaved);

    setIsTogglingSave(false);

    if (error) {
      setSaved(previousSaved);
      onToast?.(formatFeedEngagementError(error));
      return;
    }

    setSaved(persistedSaved);
    onToast?.(persistedSaved ? "Saved to your rounds" : "Removed from saved");
  }

  async function handleShare() {
    const shareText = post.courseName
      ? `${post.author.name} played ${post.courseName} on EliteTee`
      : `${post.author.name} shared an update on EliteTee`;

    try {
      if (navigator.share) {
        await navigator.share({ title: "EliteTee", text: shareText });
        return;
      }
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
        onToast?.("Link copied to clipboard");
        return;
      }
    } catch {
      return;
    }
    onToast?.("Could not share this post. Try again.");
  }

  async function handleCommentSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!commentDraft.trim() || !engagementEnabled || isSubmittingComment) return;

    setIsSubmittingComment(true);
    const { data, error } = await createFeedPostComment(post.id, commentDraft);

    setIsSubmittingComment(false);

    if (error || !data) {
      onToast?.(formatFeedEngagementError(error ?? new Error("Comment could not be posted.")));
      return;
    }

    setComments((current) => [...current, data]);
    setCommentCount((count) => count + 1);
    setCommentDraft("");
    setCommentsLoaded(true);
    onToast?.("Comment added");
  }

  async function handleDeleteComment(commentId: string) {
    if (!engagementEnabled || deletingCommentId) return;

    setDeletingCommentId(commentId);
    const { error } = await deleteFeedPostComment(commentId);
    setDeletingCommentId(null);

    if (error) {
      onToast?.(formatFeedEngagementError(error));
      return;
    }

    setComments((current) => current.filter((comment) => comment.id !== commentId));
    setCommentCount((count) => Math.max(0, count - 1));
    onToast?.("Comment removed");
  }

  function handleToggleComments() {
    setShowComments((current) => {
      const next = !current;
      if (next && engagementEnabled && !commentsLoaded) {
        void loadComments();
      }
      return next;
    });
  }

  const ratingDisplay = formatCourseRatingDisplay(post.rating);

  const showCourseBlock =
    isCourseRound && (roundLabel || post.courseName || post.courseLocation || ratingDisplay);
  const showSocialHeadline = !isCourseRound && !isFounder && (roundLabel || post.courseName);

  return (
    <article
      className={`feed-card feed-card--${cardKind}`}
      style={entranceStyle}
    >
      <header className="feed-card-head">
        <AuthorIdentity
          post={post}
          canViewAuthor={canViewAuthor}
          onViewAuthor={handleViewAuthor}
          showEditedLabel={showEditedLabel}
        />
        {canEdit || canDelete ? (
          <FeedPostMenu
            onEdit={canEdit ? () => setEditing(true) : undefined}
            onDelete={
              canDelete
                ? () => {
                    setDeleteError(null);
                    setConfirmingDelete(true);
                  }
                : undefined
            }
            editLabel={isCourseRound ? "Edit experience" : "Edit post"}
            deleteLabel={isCourseRound ? "Delete experience" : "Delete post"}
          />
        ) : null}
      </header>

      {hasMedia ? (
        <FeedCardHeroMedia
          photos={photoRecords}
          mediaItems={post.mediaItems}
          imageAlt={post.imageAlt}
          rating={isCourseRound ? (ratingDisplay ? post.rating : undefined) : undefined}
          maxRating={MAX_RATING}
          variant={isCourseRound ? "hero" : "editorial"}
        />
      ) : isCourseRound && post.golfCourseId ? (
        <div className="feed-card-course-fallback" aria-hidden={false}>
          <CourseImage
            name={post.courseName || "Course"}
            imageUrl={null}
            thumbnailUrl={null}
            golfCourseId={post.golfCourseId}
            variant="card"
            className="feed-card-course-fallback-image"
          />
        </div>
      ) : isCourseRound ? (
        <div className="feed-card-photo-placeholder feed-card-photo-placeholder--compact" role="img" aria-label="No photos yet">
          <span className="feed-card-photo-placeholder-label">No photos yet</span>
        </div>
      ) : null}

      {showCourseBlock ? (
        <div className="feed-card-course-block">
          {roundLabel ? (
            <span className={badgeToneClass("positive")}>{roundLabel}</span>
          ) : null}
          {post.courseName ? (
            <h3 className="feed-card-course-title">{post.courseName}</h3>
          ) : null}
          {post.courseLocation ? (
            <p className="feed-card-course-location">{post.courseLocation}</p>
          ) : null}
          {ratingDisplay && !hasMedia ? (
            <div
              className="feed-card-rating feed-card-rating--inline"
              title={`Rated ${ratingDisplay} out of ${MAX_RATING.toFixed(1)}`}
            >
              <span className="feed-card-rating-value">{ratingDisplay}</span>
              <span className="feed-card-rating-label">Member rating</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {showSocialHeadline ? (
        <div className="feed-card-social-head">
          {roundLabel ? <span className={badgeToneClass(badgeTone)}>{roundLabel}</span> : null}
          {post.courseName ? <p className="feed-card-social-title">{post.courseName}</p> : null}
          {post.courseLocation ? (
            <p className="feed-card-social-location">{post.courseLocation}</p>
          ) : null}
        </div>
      ) : null}

      <div className="feed-card-body">
        {contentFlags.length > 0 ? (
          <div className="et-feed-content-flag" role="note">
            <p className="et-caption">Review suggested: {contentFlags.join(" · ")}</p>
          </div>
        ) : null}

        {post.caption ? (
          <p className={`feed-card-caption${isFounder ? " feed-card-caption--founder" : ""}`}>
            {post.caption}
          </p>
        ) : null}

        {metaChips.length > 0 ? (
          <ul className="feed-card-meta-chips" aria-label="Post details">
            {metaChips.map((chip) => (
              <li key={chip.key} className={chipToneClass(chip.tone)}>
                {chip.tone === "location" ? <PinIcon /> : null}
                {chip.tone === "date" ? <CalendarIcon /> : null}
                <span className="feed-card-meta-chip-label">{chip.label}</span>
                <span className="feed-card-meta-chip-value">{chip.value}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="feed-card-actions" role="group" aria-label="Post actions">
          <button
            type="button"
            className={`feed-card-action${liked ? " is-active is-liked" : ""}`}
            onClick={() => void toggleLike()}
            aria-pressed={liked}
            disabled={!engagementEnabled || isTogglingLike}
          >
            <HeartIcon filled={liked} />
            <span className="feed-card-action-count">{likeCount}</span>
            <span className="visually-hidden">likes</span>
          </button>
          <button
            type="button"
            className={`feed-card-action${showComments ? " is-active" : ""}`}
            onClick={handleToggleComments}
            aria-expanded={showComments}
            disabled={!engagementEnabled}
          >
            <CommentIcon />
            <span className="feed-card-action-count">{commentCount}</span>
            <span className="visually-hidden">comments</span>
          </button>
          <button
            type="button"
            className={`feed-card-action${saved ? " is-active is-saved" : ""}`}
            onClick={() => void toggleSave()}
            aria-pressed={saved}
            disabled={!engagementEnabled || isTogglingSave}
          >
            <SaveIcon filled={saved} />
            <span className="feed-card-action-label">{saved ? "Saved" : "Save"}</span>
          </button>
          <button
            type="button"
            className="feed-card-action feed-card-action--share"
            onClick={handleShare}
          >
            <ShareIcon />
            <span className="feed-card-action-label">Share</span>
          </button>
        </div>

        {previewComment && !showComments ? (
          <div className="feed-card-comment-preview">
            <p className="feed-card-comment-preview-text">
              <strong>{previewComment.authorName}</strong> {previewComment.body}
            </p>
            <button
              type="button"
              className="feed-card-comment-link"
              onClick={handleToggleComments}
            >
              {commentCount > 1 ? `View all ${commentCount} comments` : "View comment"}
            </button>
          </div>
        ) : null}

        {showComments ? (
          <div className="feed-card-comments-panel">
            {isLoadingComments ? (
              <p className="feed-card-comments-status" aria-live="polite">
                Loading comments…
              </p>
            ) : null}

            {commentsError ? (
              <div className="feed-card-comments-status feed-card-comments-status--error" role="alert">
                <p>{commentsError}</p>
                <button type="button" className="feed-card-comment-link" onClick={() => void loadComments()}>
                  Try again
                </button>
              </div>
            ) : null}

            {!isLoadingComments && !commentsError && comments.length === 0 ? (
              <p className="feed-card-comments-empty">No comments yet. Start the conversation.</p>
            ) : null}

            {!isLoadingComments && !commentsError && comments.length > 0 ? (
              <ul className="feed-card-comments">
                {comments.map((comment) => (
                  <li key={comment.id} className="feed-card-comment-item">
                    <FeedAvatar
                      name={comment.authorName}
                      src={comment.authorAvatarUrl}
                      size="sm"
                    />
                    <div className="feed-card-comment-body">
                      <p className="feed-card-comment-meta">
                        <strong>{comment.authorName}</strong>
                        {comment.displayTimestamp ? (
                          <time dateTime={comment.createdAt}>{comment.displayTimestamp}</time>
                        ) : null}
                      </p>
                      <p className="feed-card-comment-text">{comment.body}</p>
                    </div>
                    {canDeleteFeedPostComment(comment.userId, currentUserId) ? (
                      <button
                        type="button"
                        className="feed-card-comment-delete"
                        onClick={() => void handleDeleteComment(comment.id)}
                        disabled={deletingCommentId === comment.id}
                      >
                        {deletingCommentId === comment.id ? "Deleting…" : "Delete"}
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {showComments && engagementEnabled ? (
          <form className="feed-card-comment-form" onSubmit={handleCommentSubmit}>
            <label className="visually-hidden" htmlFor={`feed-comment-${post.id}`}>
              Add a comment
            </label>
            <input
              id={`feed-comment-${post.id}`}
              type="text"
              value={commentDraft}
              onChange={(event) => setCommentDraft(event.target.value)}
              placeholder="Add a comment…"
              disabled={isSubmittingComment}
            />
            <button
              type="submit"
              className="feed-card-comment-submit"
              disabled={isSubmittingComment || !commentDraft.trim()}
            >
              {isSubmittingComment ? "Posting…" : "Post"}
            </button>
          </form>
        ) : null}
      </div>

      {editing ? (
        <FeedPostEditModal
          post={post}
          currentUserId={currentUserId}
          viewerIsAdmin={viewerIsAdmin}
          onClose={() => setEditing(false)}
          onSaved={(updatedPost) => {
            onPostUpdated?.(mergeFeedPostAfterEdit(post, updatedPost));
            setEditing(false);
            onToast?.("Post updated");
          }}
        />
      ) : null}

      {confirmingDelete ? (
        <div
          className="feed-edit-backdrop"
          role="presentation"
          onClick={isDeleting ? undefined : () => setConfirmingDelete(false)}
        >
          <div
            className="feed-edit-modal feed-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`delete-${post.id}-title`}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="feed-edit-modal-head">
              <h2 id={`delete-${post.id}-title`} className="feed-edit-modal-title">
                {isCourseRound ? "Delete experience?" : "Delete post?"}
              </h2>
              <button
                type="button"
                className="feed-edit-modal-close"
                onClick={() => setConfirmingDelete(false)}
                disabled={isDeleting}
                aria-label="Close"
              >
                ×
              </button>
            </header>
            <div className="feed-edit-form">
              <p className="feed-edit-field-hint">
                This permanently removes the {isCourseRound ? "experience" : "post"}
                {isCourseRound ? ", its photos/videos, and feed engagement" : " and its engagement"}.
                This cannot be undone. The golf course itself will not be deleted.
              </p>
              {deleteError ? (
                <p className="feed-edit-error" role="alert">
                  {deleteError}
                </p>
              ) : null}
              <div className="feed-edit-actions">
                <button
                  type="button"
                  className="et-btn et-btn--secondary"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="et-btn feed-delete-confirm-btn"
                  disabled={isDeleting}
                  onClick={() => {
                    void (async () => {
                      setIsDeleting(true);
                      setDeleteError(null);
                      const { error } = await deleteOwnFeedPost(post.id);
                      setIsDeleting(false);
                      if (error) {
                        setDeleteError(
                          memberFacingPortalError(error.message ?? "unknown", "feed"),
                        );
                        return;
                      }
                      setConfirmingDelete(false);
                      onPostDeleted?.(post.id);
                      onToast?.(isCourseRound ? "Experience deleted" : "Post deleted");
                    })();
                  }}
                >
                  {isDeleting ? "Deleting…" : "Delete permanently"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}
