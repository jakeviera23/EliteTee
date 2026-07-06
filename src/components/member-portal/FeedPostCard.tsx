import { FormEvent, useState } from "react";
import type { FeedPost } from "../../data/portalSocial";
import { MAX_RATING, postTypeLabels } from "../../data/portalSocial";
import { useComingSoon } from "./ComingSoonProvider";
import { MemberClubAvatar } from "./MemberClubAvatar";
import { VerifiedBadge } from "./VerifiedBadge";

type FeedPostComment = {
  id: string;
  author: string;
  text: string;
};

type FeedPostCardProps = {
  post: FeedPost;
  compact?: boolean;
  onToast?: (message: string) => void;
};

function ActionButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`portal-feed-action${active ? " is-active" : ""}`}
      onClick={onClick}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

export function FeedPostCard({ post, compact = false, onToast }: FeedPostCardProps) {
  const { showComingSoon } = useComingSoon();
  const [liked, setLiked] = useState(Boolean(post.isLiked));
  const [saved, setSaved] = useState(Boolean(post.isSaved));
  const [likeCount, setLikeCount] = useState(post.likes);
  const [commentCount, setCommentCount] = useState(post.comments);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [comments, setComments] = useState<FeedPostComment[]>(
    post.commentPreview
      ? [{ id: "preview", author: post.commentPreview.author, text: post.commentPreview.text }]
      : [],
  );
  const isCarousel = post.postType === "carousel" && post.images.length > 1;
  const isOwnPost = post.timestamp === "Just now";

  function toggleLike() {
    setLiked((current) => {
      const next = !current;
      setLikeCount((count) => count + (next ? 1 : -1));
      return next;
    });
  }

  function toggleSave() {
    setSaved((current) => {
      const next = !current;
      onToast?.(next ? "Post saved" : "Post removed from saved");
      return next;
    });
  }

  function handleMessage() {
    showComingSoon("Messaging");
  }

  function handleRequestRound() {
    showComingSoon("Request Round");
  }

  function handleCommentSubmit(event: FormEvent<HTMLFormElement>) {
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

  return (
    <>
      <article className={`portal-feed-card portal-feed-card--polished${compact ? " portal-feed-card--compact" : ""}`}>
        <header className="portal-feed-card-head">
          <div className="portal-feed-author">
            <MemberClubAvatar
              member={{ club_logo_url: post.author.avatarImage ?? null }}
              size="md"
            />
            <div className="portal-feed-author-text">
              <p className="portal-feed-author-name">
                {post.author.name}
                {post.author.isVerified ? <VerifiedBadge /> : null}
              </p>
              <p className="portal-feed-author-meta">
                {post.courseName} · {post.courseLocation}
              </p>
            </div>
          </div>
          <div className="portal-feed-head-meta">
            <span className="portal-feed-type">{postTypeLabels[post.postType]}</span>
            <time className="portal-feed-time">{post.timestamp}</time>
          </div>
        </header>

        <div className={`portal-feed-media portal-feed-media--polished${isCarousel ? " portal-feed-media--carousel" : ""}`}>
          <img
            src={post.images[carouselIndex]}
            alt={post.imageAlt}
            loading="lazy"
            decoding="async"
          />
          {isCarousel ? (
            <div className="portal-feed-carousel-nav">
              <button
                type="button"
                aria-label="Previous photo"
                disabled={carouselIndex === 0}
                onClick={() => setCarouselIndex((index) => Math.max(0, index - 1))}
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Next photo"
                disabled={carouselIndex === post.images.length - 1}
                onClick={() =>
                  setCarouselIndex((index) => Math.min(post.images.length - 1, index + 1))
                }
              >
                ›
              </button>
            </div>
          ) : null}
        </div>

        <div className="portal-feed-card-body">
          {post.rating ? (
            <p className="portal-feed-rating">
              Rated {post.rating} / {MAX_RATING}
            </p>
          ) : null}
          {post.playedWith ? (
            <p className="portal-feed-played-with">Played with {post.playedWith}</p>
          ) : null}
          <p className="portal-feed-caption">
            <strong>{post.author.name}</strong> {post.caption}
          </p>

          <div className="portal-feed-actions" role="group" aria-label="Post actions">
            <ActionButton label={`Like · ${likeCount}`} active={liked} onClick={toggleLike} />
            <ActionButton
              label={`Comment · ${commentCount}`}
              active={showComments}
              onClick={() => setShowComments((value) => !value)}
            />
            <ActionButton label={saved ? "Saved" : "Save"} active={saved} onClick={toggleSave} />
            <ActionButton label="Message" onClick={handleMessage} />
            {!isOwnPost ? (
              <ActionButton label="Request Round" onClick={handleRequestRound} />
            ) : null}
          </div>

          {comments.length > 0 ? (
            <ul className="portal-feed-comments">
              {comments.map((comment) => (
                <li key={comment.id}>
                  <strong>{comment.author}</strong> {comment.text}
                </li>
              ))}
            </ul>
          ) : null}

          {showComments ? (
            <form className="portal-feed-comment-form" onSubmit={handleCommentSubmit}>
              <label className="visually-hidden" htmlFor={`comment-${post.id}`}>
                Add a comment
              </label>
              <input
                id={`comment-${post.id}`}
                type="text"
                value={commentDraft}
                onChange={(event) => setCommentDraft(event.target.value)}
                placeholder="Add a comment..."
              />
              <button type="submit" className="portal-btn portal-btn--gold portal-btn--compact">
                Post
              </button>
            </form>
          ) : null}
        </div>
      </article>
    </>
  );
}
