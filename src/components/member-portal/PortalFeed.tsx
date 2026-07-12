import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FeedPost } from "../../data/portalSocial";
import { earlyStageCopy } from "../../data/portalSocial";
import { getFounderWelcomePost } from "../../data/feedMockData";
import {
  dedupeFeedPosts,
  fetchMemberFeedPage,
  type MemberFeedCursor,
} from "../../lib/memberFeedPosts";
import { mergeFeedPostAfterEdit } from "../../lib/feedPostEditing";
import { fetchOwnMemberProfile } from "../../lib/memberProfiles";
import { getCurrentAuthUserId } from "../../lib/authUserLinking";
import { buildComposerAuthor } from "../../lib/portalProfileDisplay";
import { resolveMemberProfileMedia } from "../../lib/memberProfileMedia";
import { getPortalProfileExtras } from "../../lib/portalProfileExtras";
import type { ViewMemberProfileHandler } from "../../types/memberProfileNavigation";
import { FeedCard } from "./FeedCard";
import { FeedComposer } from "./FeedComposer";
import { usePortalToast } from "./PortalToastProvider";

type PortalFeedProps = {
  showComposer?: boolean;
  composerId?: string;
  isActive?: boolean;
  onViewMemberProfile?: ViewMemberProfileHandler;
};

export function PortalFeed({
  showComposer = true,
  composerId = "feed-composer",
  isActive = true,
  onViewMemberProfile,
}: PortalFeedProps) {
  const { showToast } = usePortalToast();
  const [composerAuthor, setComposerAuthor] = useState(() => buildComposerAuthor(null));
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [memberPosts, setMemberPosts] = useState<FeedPost[]>([]);
  const [nextCursor, setNextCursor] = useState<MemberFeedCursor | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const hasLoadedInitialRef = useRef(false);

  const loadAuthor = useCallback(async () => {
    const [{ data }, { userId }] = await Promise.all([
      fetchOwnMemberProfile(),
      getCurrentAuthUserId(),
    ]);
    setCurrentUserId(userId ?? null);
    const extras = getPortalProfileExtras(data?.user_id ?? userId);
    const media = await resolveMemberProfileMedia(data);
    setComposerAuthor(buildComposerAuthor(data, extras, media));
  }, []);

  const loadInitialPage = useCallback(async () => {
    setIsLoadingPosts(true);
    setPostsError(null);
    setLoadMoreError(null);

    const { data, nextCursor: cursor, hasMore: moreAvailable, error } =
      await fetchMemberFeedPage();

    if (error) {
      console.error("[PortalFeed] failed to load posts", error.message);
      setPostsError("Member posts could not be loaded right now.");
      setMemberPosts([]);
      setNextCursor(null);
      setHasMore(false);
      setIsLoadingPosts(false);
      return;
    }

    setMemberPosts(data);
    setNextCursor(cursor);
    setHasMore(moreAvailable);
    setIsLoadingPosts(false);
  }, []);

  useEffect(() => {
    void loadAuthor();
  }, [loadAuthor]);

  useEffect(() => {
    if (!isActive) return;
    if (hasLoadedInitialRef.current) return;

    hasLoadedInitialRef.current = true;
    void loadInitialPage();
  }, [isActive, loadInitialPage]);

  async function loadMorePosts() {
    if (!hasMore || isLoadingMore || !nextCursor) return;

    setIsLoadingMore(true);
    setLoadMoreError(null);

    const { data, nextCursor: cursor, hasMore: moreAvailable, error } =
      await fetchMemberFeedPage({ cursor: nextCursor });

    if (error) {
      console.error("[PortalFeed] failed to load more posts", error.message);
      setLoadMoreError("Older posts could not be loaded. Try again.");
      setIsLoadingMore(false);
      return;
    }

    setMemberPosts((current) => dedupeFeedPosts([...current, ...data]));
    setNextCursor(cursor);
    setHasMore(moreAvailable);
    setIsLoadingMore(false);
  }

  function handlePosted(newPost?: FeedPost) {
    showToast("Post shared");

    if (newPost) {
      setMemberPosts((current) => dedupeFeedPosts([newPost, ...current]));
      return;
    }

    void loadInitialPage();
  }

  function handlePostUpdated(updatedPost: FeedPost) {
    setMemberPosts((current) =>
      current.map((post) =>
        post.id === updatedPost.id ? mergeFeedPostAfterEdit(post, updatedPost) : post,
      ),
    );
  }

  const founderWelcome = useMemo(() => getFounderWelcomePost(), []);
  const hasMemberPosts = memberPosts.length > 0;

  return (
    <section className="et-feed et-feed-card-scope" aria-labelledby="feed-heading">
      <header className="et-feed-hero et-animate-fade-up">
        <p className="et-eyebrow et-eyebrow--line et-eyebrow--accent">Member Society</p>
        <h2 id="feed-heading" className="et-h2 et-feed-title">
          Feed
        </h2>
        <p className="et-body et-feed-lead">
          Rounds, introductions, and member updates within EliteTee.
        </p>
      </header>

      {showComposer ? (
        <div className="et-feed-composer-wrap et-animate-fade-up et-animate-delay-1">
          <FeedComposer id={composerId} author={composerAuthor} onPosted={handlePosted} />
        </div>
      ) : null}

      <section className="et-feed-stream" aria-labelledby="latest-activity-heading">
        <div className="et-feed-stream-head">
          <h3 id="latest-activity-heading" className="et-h3">
            Latest
          </h3>
        </div>

        <div className="et-feed-list et-feed-list--founder">
          <p className="et-label et-feed-founder-label">From the founder</p>
          <FeedCard
            post={founderWelcome}
            index={0}
            variant="founder"
            onToast={showToast}
          />
        </div>

        {isLoadingPosts ? (
          <div className="et-loading et-feed-loading" aria-live="polite" aria-busy="true">
            <div className="et-loading__mark" aria-hidden="true" />
            <p className="et-loading__text">Loading member posts</p>
          </div>
        ) : null}

        {postsError ? (
          <div className="et-feed-error">
            <div className="et-alert et-alert--error" role="alert">
              <div>
                <p className="et-alert__title">Posts unavailable</p>
                <p className="et-alert__body">{postsError}</p>
              </div>
            </div>
            <button
              type="button"
              className="et-btn et-btn--secondary"
              onClick={() => void loadInitialPage()}
            >
              Retry
            </button>
          </div>
        ) : null}

        {!isLoadingPosts && hasMemberPosts ? (
          <div className="et-feed-list">
            {memberPosts.map((post, index) => (
              <FeedCard
                key={post.id}
                post={post}
                index={index + 1}
                currentUserId={currentUserId}
                onToast={showToast}
                onViewAuthor={onViewMemberProfile}
                onPostUpdated={handlePostUpdated}
              />
            ))}
          </div>
        ) : null}

        {!isLoadingPosts && !hasMemberPosts && !postsError ? (
          <div className="et-feed-empty">
            <p className="et-feed-empty-title">{earlyStageCopy.feedEmptyTitle}</p>
            <p className="et-feed-empty-lead">{earlyStageCopy.feedEmptyHint}</p>
          </div>
        ) : null}

        {loadMoreError ? (
          <div className="et-feed-error">
            <div className="et-alert et-alert--warning" role="alert">
              <div>
                <p className="et-alert__title">Could not load older posts</p>
                <p className="et-alert__body">{loadMoreError}</p>
              </div>
            </div>
            <button
              type="button"
              className="et-btn et-btn--secondary"
              onClick={() => void loadMorePosts()}
            >
              Retry
            </button>
          </div>
        ) : null}

        {!isLoadingPosts && hasMore ? (
          <button
            type="button"
            className="et-feed-load-more"
            onClick={() => void loadMorePosts()}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? "Loading older posts…" : "Load more posts"}
          </button>
        ) : null}
      </section>
    </section>
  );
}
