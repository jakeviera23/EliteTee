import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import type { FeedPost, FeedPostComment } from "../../data/portalSocial";
import { MAX_RATING, postTypeLabels } from "../../data/portalSocial";
import { formatCourseRatingDisplay } from "../../lib/courseRating";
import { FEED_CARD_ICON_CLASSES } from "../../lib/feedCardScope";
import { resolveFeedCardBadgeLabel } from "../../lib/feedPostDisplay";
import { canShowFeedPostEditMenu, isFeedPostEdited, mergeFeedPostAfterEdit } from "../../lib/feedPostEditing";
import { signedUrlsToPhotoRecords } from "../../lib/memberCourseRoundPhotos";
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
  buildVisibleFeedMetaChips,
  getFeedCaptionPreview,
  isCourseRoundPost,
  type FeedMetaChipTone,
} from "../../lib/feedCardMeta";
import { FeedAvatar } from "./FeedAvatar";
import { FeedCardHeroMedia } from "./FeedCardHeroMedia";
import { CourseImage } from "./CourseImage";
import { FeedPostEditModal } from "./FeedPostEditModal";
import { FeedPostMenu } from "./FeedPostMenu";
import { VerifiedBadge } from "./VerifiedBadge";
import {
  buildContributionResponseAction,
  contributionCommentPlaceholder,
  type ContributionResponseAction,
} from "../../lib/contributionResponse";
import { buildFeedPostDeepLink, buildFeedPostShareText } from "../../lib/feedPostShare";

type FeedCardProps = {
  post: FeedPost;
  index?: number;
  variant?: "default" | "founder";
  currentUserId?: string | null;
  viewerIsAdmin?: boolean;
  onToast?: (message: string) => void;
  onViewAuthor?: (userId: string, memberName: string) => void;
  onRespondPrivately?: (
    userId: string,
    memberName: string,
    response: ContributionResponseAction,
  ) => void;
  onPostUpdated?: (post: FeedPost) => void;
  isActivityFocus?: boolean;
  isDetailView?: boolean;
  onOpenDetail?: () => void;
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

function FeedCourseName({
  post,
  className,
  heading = false,
}: {
  post: FeedPost;
  className: string;
  heading?: boolean;
}) {
  if (!post.courseName) return null;

  if (post.courseSlug) {
    return (
      <Link
        to={`/courses/${post.courseSlug}`}
        className={`feed-card-course-link ${className}`}
        onClick={(event) => event.stopPropagation()}
      >
        {post.courseName}
      </Link>
    );
  }

  if (heading) {
    return <h3 className={className}>{post.courseName}</h3>;
  }

  return <p className={className}>{post.courseName}</p>;
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
  onRespondPrivately,
  onPostUpdated,
  isActivityFocus = false,
  isDetailView = false,
  onOpenDetail,
}: FeedCardProps) {
  const isFounder = variant === "founder";
  const [editing, setEditing] = useState(false);
  const engagementEnabled = !isFounder && isPersistedFeedPostId(post.id);
  const [liked, setLiked] = useState(Boolean(post.isLiked));
  const [saved, setSaved] = useState(Boolean(post.isSaved));
  const [likeCount, setLikeCount] = useState(post.likes);
  const [commentCount, setCommentCount] = useState(post.comments);
  const [showComments, setShowComments] = useState(isDetailView);
  const [commentDraft, setCommentDraft] = useState("");
  const [comments, setComments] = useState<FeedPostComment[]>(post.feedComments ?? []);
  const [commentsLoaded, setCommentsLoaded] = useState(Boolean(post.feedComments?.length));
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [isTogglingLike, setIsTogglingLike] = useState(false);
  const [isTogglingSave, setIsTogglingSave] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [captionExpanded, setCaptionExpanded] = useState(isDetailView);

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

  useEffect(() => {
    if (!isDetailView || !engagementEnabled || commentsLoaded) return;
    void loadComments();
  }, [isDetailView, engagementEnabled, commentsLoaded, post.id]);

  const isCourseRound = !isFounder && isCourseRoundPost(post);
  const canEdit =
    !isFounder &&
    canShowFeedPostEditMenu(post, { userId: currentUserId, isAdmin: viewerIsAdmin });
  const showEditedLabel = isFeedPostEdited(post.createdAt, post.updatedAt);
  const roundLabel = resolveFeedCardBadgeLabel(post) || postTypeLabels[post.postType];
  const hasImages = (post.images?.length ?? 0) > 0;
  const photoRecords = useMemo(
    () =>
      hasImages
        ? signedUrlsToPhotoRecords(post.images, post.memberCourseRoundId ?? "")
        : [],
    [hasImages, post.images, post.memberCourseRoundId],
  );
  const metaChips = buildVisibleFeedMetaChips(post, isCourseRound);
  const captionPreview = getFeedCaptionPreview(post.caption, captionExpanded, isFounder ? 1000 : 320);
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
  const contentFlags = isFounder || !viewerIsAdmin ? [] : getFeedContentFlags(post);
  const responseAction = isFounder
    ? null
    : buildContributionResponseAction(post, currentUserId);

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
    const shareText = buildFeedPostShareText({
      authorName: post.author.name,
      courseName: post.courseName,
      caption: post.caption,
    });
    const shareUrl = isPersistedFeedPostId(post.id)
      ? buildFeedPostDeepLink(post.id, window.location.origin)
      : null;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "EliteTee",
          text: shareText,
          ...(shareUrl ? { url: shareUrl } : {}),
        });
        return;
      }
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl ?? shareText);
        onToast?.(shareUrl ? "Post link copied" : "Post text copied");
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
  const canOpenDetail = Boolean(onOpenDetail && !isFounder && !isDetailView);

  function handleOpenDetail() {
    onOpenDetail?.();
  }

  function handleOpenTargetKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!canOpenDetail) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleOpenDetail();
    }
  }

  const primaryContent = (
    <>
      {showCourseBlock ? (
        <div className="feed-card-course-block">
          {roundLabel ? (
            <span className={badgeToneClass("positive")}>{roundLabel}</span>
          ) : null}
          <FeedCourseName
            post={post}
            className="feed-card-course-title"
            heading
          />
          {post.courseLocation ? (
            <p className="feed-card-course-location">{post.courseLocation}</p>
          ) : null}
        </div>
      ) : null}

      {showSocialHeadline ? (
        <div className="feed-card-social-head">
          {roundLabel ? <span className={badgeToneClass(badgeTone)}>{roundLabel}</span> : null}
          <FeedCourseName post={post} className="feed-card-social-title" />
          {post.courseLocation ? (
            <p className="feed-card-social-location">{post.courseLocation}</p>
          ) : null}
        </div>
      ) : null}

      <div className="feed-card-body-primary">
        {contentFlags.length > 0 ? (
          <div className="et-feed-content-flag" role="note">
            <p className="et-caption">Review suggested: {contentFlags.join(" · ")}</p>
          </div>
        ) : null}

        {post.caption ? (
          <div className="feed-card-caption-wrap">
            <p className={`feed-card-caption${isFounder ? " feed-card-caption--founder" : ""}`}>
              {captionPreview.text}
            </p>
            {captionPreview.isTruncated && !isDetailView ? (
              <button
                type="button"
                className="feed-card-caption-more"
                onClick={(event) => {
                  event.stopPropagation();
                  if (onOpenDetail) {
                    onOpenDetail();
                  } else {
                    setCaptionExpanded(true);
                  }
                }}
              >
                Read full post
              </button>
            ) : null}
          </div>
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

        {responseAction?.presentation === "bridge" && onRespondPrivately && authorUserId ? (
          <aside className="feed-card-response-bridge" aria-label="Continue this contribution">
            <div>
              <span>{responseAction.eyebrow}</span>
              <p>{responseAction.explanation}</p>
            </div>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onRespondPrivately(authorUserId, post.author.name, responseAction);
              }}
            >
              {responseAction.label}
            </button>
          </aside>
        ) : null}

        {previewComment && !showComments && !isDetailView ? (
          <div className="feed-card-comment-preview">
            <p className="feed-card-comment-preview-text">
              <strong>{previewComment.authorName}</strong> {previewComment.body}
            </p>
            <button
              type="button"
              className="feed-card-comment-link"
              onClick={(event) => {
                event.stopPropagation();
                handleToggleComments();
              }}
            >
              {commentCount > 1 ? `View all ${commentCount} comments` : "View comment"}
            </button>
          </div>
        ) : null}
      </div>
    </>
  );

  return (
    <article
      id={`feed-post-${post.id}`}
      className={`feed-card feed-card--${cardKind}${isActivityFocus ? " is-activity-focus" : ""}${isDetailView ? " feed-card--detail" : ""}`}
      style={entranceStyle}
    >
      <header className="feed-card-head">
        <AuthorIdentity
          post={post}
          canViewAuthor={canViewAuthor}
          onViewAuthor={handleViewAuthor}
          showEditedLabel={showEditedLabel}
        />
        {canEdit ? <FeedPostMenu onEdit={() => setEditing(true)} /> : null}
      </header>

      {hasImages ? (
        <FeedCardHeroMedia
          photos={photoRecords}
          imageAlt={post.imageAlt}
          rating={isCourseRound ? (ratingDisplay ? post.rating : undefined) : undefined}
          maxRating={MAX_RATING}
          variant={isCourseRound ? "hero" : "editorial"}
        />
      ) : isCourseRound ? (
        <div className="feed-card-course-media">
          <CourseImage
            name={post.courseName || "Golf course"}
            region={post.courseLocation}
            variant="hero"
            className="feed-card-course-image"
            overlay
            alt={post.courseName ? `${post.courseName} course view` : "Golf course"}
          />
          {ratingDisplay ? (
            <div
              className="feed-card-rating feed-card-rating--overlay"
              title={`Rated ${ratingDisplay} out of ${MAX_RATING.toFixed(1)}`}
            >
              <span className="feed-card-rating-value">{ratingDisplay}</span>
              <span className="feed-card-rating-label">Member rating</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {canOpenDetail ? (
        <div
          className="feed-card-open-target"
          role="button"
          tabIndex={0}
          onClick={handleOpenDetail}
          onKeyDown={handleOpenTargetKeyDown}
          aria-label="Open post details"
        >
          {primaryContent}
        </div>
      ) : (
        primaryContent
      )}

      <div className="feed-card-body">
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
          {responseAction?.presentation === "compact" && onRespondPrivately && authorUserId ? (
            <button
              type="button"
              className="feed-card-action feed-card-action--respond"
              onClick={() => onRespondPrivately(authorUserId, post.author.name, responseAction)}
            >
              <span className="feed-card-action-label">{responseAction.label}</span>
            </button>
          ) : null}
        </div>

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
              placeholder={contributionCommentPlaceholder(post)}
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
          viewerIsAdmin={viewerIsAdmin}
          onClose={() => setEditing(false)}
          onSaved={(updatedPost) => {
            onPostUpdated?.(mergeFeedPostAfterEdit(post, updatedPost));
            setEditing(false);
            onToast?.("Post updated");
          }}
        />
      ) : null}
    </article>
  );
}
