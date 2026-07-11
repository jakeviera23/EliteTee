import { useState } from "react";
import type { FeedPost } from "../../data/portalSocial";
import { MAX_RATING, postTypeLabels } from "../../data/portalSocial";
import { signedUrlsToPhotoRecords } from "../../lib/memberCourseRoundPhotos";
import { FeedAvatar } from "./FeedAvatar";
import { RoundPhotoGallery } from "./RoundPhotoGallery";
import { VerifiedBadge } from "./VerifiedBadge";

type FeedCardProps = {
  post: FeedPost;
  index?: number;
  onToast?: (message: string) => void;
  onViewAuthor?: (userId: string, memberName: string) => void;
};

function HeartIcon({ filled }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="feed-card-action-icon">
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
    <svg viewBox="0 0 20 20" aria-hidden="true" className="feed-card-action-icon">
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
    <svg viewBox="0 0 20 20" aria-hidden="true" className="feed-card-action-icon">
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
    <svg viewBox="0 0 20 20" aria-hidden="true" className="feed-card-action-icon">
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

export function FeedCard({ post, index = 0, onToast, onViewAuthor }: FeedCardProps) {
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

  const roundLabel = post.requestLabel ?? post.roundType ?? postTypeLabels[post.postType];
  const hasImage = Boolean(post.images?.[0]);
  const hasGallery = (post.images?.length ?? 0) > 1;
  const galleryPhotos = hasGallery
    ? signedUrlsToPhotoRecords(post.images, post.memberCourseRoundId ?? "")
    : [];
  const entranceStyle = { animationDelay: `${Math.min(index, 9) * 70}ms` };

  // Like count is derived from a single boolean so it can only ever move by 1
  // and always stays in sync with the button state.
  const baseLikeCount = post.likes - (post.isLiked ? 1 : 0);
  const likeCount = baseLikeCount + (liked ? 1 : 0);

  function toggleLike() {
    setLiked((current) => !current);
  }

  function toggleSave() {
    const next = !saved;
    setSaved(next);
    onToast?.(next ? "Saved to your rounds" : "Removed from saved");
  }

  async function handleShare() {
    const shareText = `${post.author.name} played ${post.courseName} on EliteTee`;
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
      /* user dismissed share sheet — no-op */
      return;
    }
    onToast?.("Sharing coming soon");
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

  const authorUserId = post.author.id?.trim();
  const canViewAuthor = Boolean(onViewAuthor && authorUserId);

  function handleViewAuthor() {
    if (!onViewAuthor || !authorUserId) return;
    onViewAuthor(authorUserId, post.author.name);
  }

  return (
    <article className="feed-card" style={entranceStyle}>
      <header className="feed-card-head">
        {canViewAuthor ? (
          <button
            type="button"
            className="feed-card-identity feed-card-identity--link"
            onClick={handleViewAuthor}
            aria-label={`View ${post.author.name}'s profile`}
          >
            <FeedAvatar name={post.author.name} src={post.author.avatarImage} size="md" />
            <div className="feed-card-identity-text">
              <p className="feed-card-name">
                {post.author.name}
                {post.author.isVerified ? <VerifiedBadge label="Verified golfer" /> : null}
              </p>
              <p className="feed-card-meta">
                {post.author.title ? (
                  <span className="feed-card-club">{post.author.title}</span>
                ) : post.author.homeCourse ? (
                  <>
                    <span className="feed-card-club">{post.author.homeCourse}</span>
                    {post.timestamp ? (
                      <span className="feed-card-dot" aria-hidden="true">
                        ·
                      </span>
                    ) : null}
                  </>
                ) : null}
                {post.timestamp ? (
                  <time className="feed-card-time">{post.timestamp}</time>
                ) : null}
              </p>
            </div>
          </button>
        ) : (
          <div className="feed-card-identity">
            <FeedAvatar name={post.author.name} src={post.author.avatarImage} size="md" />
            <div className="feed-card-identity-text">
              <p className="feed-card-name">
                {post.author.name}
                {post.author.isVerified ? <VerifiedBadge label="Verified golfer" /> : null}
              </p>
              <p className="feed-card-meta">
                {post.author.title ? (
                  <span className="feed-card-club">{post.author.title}</span>
                ) : post.author.homeCourse ? (
                  <>
                    <span className="feed-card-club">{post.author.homeCourse}</span>
                    {post.timestamp ? (
                      <span className="feed-card-dot" aria-hidden="true">
                        ·
                      </span>
                    ) : null}
                  </>
                ) : null}
                {post.timestamp ? (
                  <time className="feed-card-time">{post.timestamp}</time>
                ) : null}
              </p>
            </div>
          </div>
        )}
        {post.rating ? (
          <div className="feed-card-rating" title={`Rated ${post.rating} out of ${MAX_RATING}`}>
            <span className="feed-card-rating-value">{post.rating.toFixed(1)}</span>
            <span className="feed-card-rating-label">Rated</span>
          </div>
        ) : null}
      </header>

      {hasGallery ? (
        <div className="feed-card-media feed-card-media--gallery">
          <RoundPhotoGallery photos={galleryPhotos} />
          {roundLabel ? <span className="feed-card-chip">{roundLabel}</span> : null}
          <div className="feed-card-media-caption">
            <p className="feed-card-course">{post.courseName}</p>
            <p className="feed-card-location">{post.courseLocation}</p>
          </div>
        </div>
      ) : hasImage ? (
        <div className="feed-card-media">
          <img src={post.images[0]} alt={post.imageAlt} loading="lazy" decoding="async" />
          <div className="feed-card-media-scrim" aria-hidden="true" />
          {roundLabel ? <span className="feed-card-chip">{roundLabel}</span> : null}
          <div className="feed-card-media-caption">
            <p className="feed-card-course">{post.courseName}</p>
            <p className="feed-card-location">{post.courseLocation}</p>
          </div>
        </div>
      ) : (
        <div className="feed-card-topline">
          {roundLabel ? <span className="feed-card-badge">{roundLabel}</span> : null}
          {post.courseName ? <p className="feed-card-topline-title">{post.courseName}</p> : null}
          {post.courseLocation ? (
            <p className="feed-card-topline-location">{post.courseLocation}</p>
          ) : null}
        </div>
      )}

      <div className="feed-card-body">
        <p className="feed-card-caption">{post.caption}</p>

        {post.details?.length ? (
          <dl className="feed-card-details">
            {post.details.map((detail) => (
              <div key={detail.label} className="feed-card-detail">
                <dt>{detail.label}</dt>
                <dd>{detail.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {post.playedWith ? (
          <p className="feed-card-played-with">
            <span className="feed-card-played-with-label">Played with</span> {post.playedWith}
          </p>
        ) : null}

        <div className="feed-card-actions" role="group" aria-label="Round actions">
          <button
            type="button"
            className={`feed-card-action${liked ? " is-active" : ""}`}
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
            className={`feed-card-action${saved ? " is-active" : ""}`}
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
            <button type="submit" className="portal-btn portal-btn--gold portal-btn--compact">
              Post
            </button>
          </form>
        ) : null}
      </div>
    </article>
  );
}
