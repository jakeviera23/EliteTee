import { useState } from "react";
import type { FeedPost } from "../../data/portalSocial";
import { MAX_RATING, postTypeLabels } from "../../data/portalSocial";
import { formatCourseRatingDisplay } from "../../lib/courseRating";
import { FEED_CARD_ICON_CLASSES } from "../../lib/feedCardScope";
import { resolveFeedCardBadgeLabel } from "../../lib/feedPostDisplay";
import { canMemberEditFeedPost, isFeedPostEdited, mergeFeedPostAfterEdit } from "../../lib/feedPostEditing";
import { signedUrlsToPhotoRecords } from "../../lib/memberCourseRoundPhotos";
import { getFeedContentFlags } from "../../lib/feedContentAudit";
import {
  badgeToneForPost,
  buildFeedMetaChips,
  isCourseRoundPost,
  type FeedMetaChipTone,
} from "../../lib/feedCardMeta";
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
  onToast?: (message: string) => void;
  onViewAuthor?: (userId: string, memberName: string) => void;
  onPostUpdated?: (post: FeedPost) => void;
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
  onToast,
  onViewAuthor,
  onPostUpdated,
}: FeedCardProps) {
  const [editing, setEditing] = useState(false);
  const [liked, setLiked] = useState(Boolean(post.isLiked));
  const [saved, setSaved] = useState(Boolean(post.isSaved));
  const [commentCount, setCommentCount] = useState(post.comments);
  const [showComments, setShowComments] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [comments, setComments] = useState(
    post.commentPreview
      ? [{ id: "preview", author: post.commentPreview.author, text: post.commentPreview.text }]
      : [],
  );

  const isFounder = variant === "founder";
  const isCourseRound = !isFounder && isCourseRoundPost(post);
  const canEdit = !isFounder && canMemberEditFeedPost(post, currentUserId);
  const showEditedLabel = isFeedPostEdited(post.createdAt, post.updatedAt);
  const roundLabel = resolveFeedCardBadgeLabel(post) || postTypeLabels[post.postType];
  const hasImages = (post.images?.length ?? 0) > 0;
  const photoRecords = hasImages
    ? signedUrlsToPhotoRecords(post.images, post.memberCourseRoundId ?? "")
    : [];
  const metaChips = buildFeedMetaChips(post);
  const badgeTone = badgeToneForPost(post);
  const entranceStyle = { animationDelay: `${Math.min(index, 9) * 55}ms` };

  const baseLikeCount = post.likes - (post.isLiked ? 1 : 0);
  const likeCount = baseLikeCount + (liked ? 1 : 0);

  const authorUserId = post.author.id?.trim();
  const canViewAuthor = Boolean(onViewAuthor && authorUserId);
  const contentFlags = isFounder ? [] : getFeedContentFlags(post);

  const cardKind = isFounder ? "founder" : isCourseRound ? "round" : "social";

  function handleViewAuthor() {
    if (!onViewAuthor || !authorUserId) return;
    onViewAuthor(authorUserId, post.author.name);
  }

  function toggleLike() {
    setLiked((current) => !current);
  }

  function toggleSave() {
    const next = !saved;
    setSaved(next);
    onToast?.(next ? "Saved to your rounds" : "Removed from saved");
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

  function handleCommentSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!commentDraft.trim()) return;
    setComments((current) => [
      ...current,
      { id: `comment-${Date.now()}`, author: "You", text: commentDraft.trim() },
    ]);
    setCommentCount((count) => count + 1);
    setCommentDraft("");
    onToast?.("Comment added");
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
        <div className="feed-card-photo-placeholder" role="img" aria-label="No course photo available">
          <span className="feed-card-photo-placeholder-label">Course photo unavailable</span>
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
          {ratingDisplay && !hasImages ? (
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
            onClick={toggleLike}
            aria-pressed={liked}
          >
            <HeartIcon filled={liked} />
            <span className="feed-card-action-count">{likeCount}</span>
            <span className="visually-hidden">likes</span>
          </button>
          <button
            type="button"
            className={`feed-card-action${showComments ? " is-active" : ""}`}
            onClick={() => setShowComments((value) => !value)}
            aria-expanded={showComments}
          >
            <CommentIcon />
            <span className="feed-card-action-count">{commentCount}</span>
            <span className="visually-hidden">comments</span>
          </button>
          <button
            type="button"
            className={`feed-card-action${saved ? " is-active is-saved" : ""}`}
            onClick={toggleSave}
            aria-pressed={saved}
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

        {comments.length > 0 && !showComments ? (
          <div className="feed-card-comment-preview">
            <p className="feed-card-comment-preview-text">
              <strong>{comments[0].author}</strong> {comments[0].text}
            </p>
            <button
              type="button"
              className="feed-card-comment-link"
              onClick={() => setShowComments(true)}
            >
              {commentCount > 1 ? `View all ${commentCount} comments` : "View comment"}
            </button>
          </div>
        ) : null}

        {comments.length > 0 && showComments ? (
          <ul className="feed-card-comments">
            {comments.map((comment) => (
              <li key={comment.id}>
                <strong>{comment.author}</strong> {comment.text}
              </li>
            ))}
          </ul>
        ) : null}

        {showComments ? (
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
            />
            <button type="submit" className="feed-card-comment-submit">
              Post
            </button>
          </form>
        ) : null}
      </div>

      {editing ? (
        <FeedPostEditModal
          post={post}
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
