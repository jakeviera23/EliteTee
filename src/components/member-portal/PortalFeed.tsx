import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FeedPost } from "../../data/portalSocial";
import { earlyStageCopy } from "../../data/portalSocial";
import { getFounderWelcomePost } from "../../data/feedMockData";
import {
  dedupeFeedPosts,
  fetchMemberFeedPage,
  type MemberFeedCursor,
} from "../../lib/memberFeedPosts";
import { fetchOwnMemberProfile } from "../../lib/memberProfiles";
import { getCurrentAuthUserId } from "../../lib/authUserLinking";
import { buildComposerAuthor } from "../../lib/portalProfileDisplay";
import { getPortalProfileExtras } from "../../lib/portalProfileExtras";
import type { ViewMemberProfileHandler } from "../../types/memberProfileNavigation";
import { FeedCard } from "./FeedCard";
import { FeedComposer } from "./FeedComposer";
import { FoundingWelcomeBanner } from "./FoundingWelcomeBanner";
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
    const extras = getPortalProfileExtras(data?.user_id ?? userId);
    setComposerAuthor(buildComposerAuthor(data, extras));
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

  const founderWelcome = useMemo(() => getFounderWelcomePost(), []);
  const hasMemberPosts = memberPosts.length > 0;

  return (
    <section className="portal-social-page portal-feed-page" aria-labelledby="feed-heading">
      <FoundingWelcomeBanner />

      <header className="portal-section-head portal-section-head--social portal-section-head--compact">
        <h2 id="feed-heading">Feed</h2>
        <p>
          Share rounds, request introductions, and connect with founding members as the community
          grows.
        </p>
      </header>

      {showComposer ? (
        <div className="portal-feed-top">
          <FeedComposer id={composerId} author={composerAuthor} onPosted={handlePosted} />
          <p className="feed-composer-helper">
            Use the feed to introduce yourself, share where you play, and ask for introductions as
            EliteTee grows.
          </p>
        </div>
      ) : null}

      <section className="portal-feed-activity" aria-labelledby="latest-activity-heading">
        <h3 id="latest-activity-heading" className="portal-feed-activity-title">
          Latest Activity
        </h3>

        <div className="portal-feed-list portal-feed-grid portal-feed-list--founder portal-feed-list--pinned">
          <FeedCard post={founderWelcome} index={0} onToast={showToast} />
        </div>

        {isLoadingPosts ? (
          <p className="portal-feed-loading">Loading member posts…</p>
        ) : null}

        {postsError ? (
          <div className="portal-feed-error">
            <p className="portal-alert portal-alert--warning" role="alert">
              {postsError}
            </p>
            <button
              type="button"
              className="portal-btn portal-btn--outline portal-btn--compact"
              onClick={() => void loadInitialPage()}
            >
              Retry
            </button>
          </div>
        ) : null}

        {!isLoadingPosts && hasMemberPosts ? (
          <div className="portal-feed-list portal-feed-grid">
            {memberPosts.map((post, index) => (
              <FeedCard
                key={post.id}
                post={post}
                index={index + 1}
                onToast={showToast}
                onViewAuthor={onViewMemberProfile}
              />
            ))}
          </div>
        ) : null}

        {!isLoadingPosts && !hasMemberPosts && !postsError ? (
          <div className="portal-feed-empty">
            <p className="portal-feed-empty-title">{earlyStageCopy.feedEmptyTitle}</p>
            <p className="portal-feed-empty-lead">{earlyStageCopy.feedEmptyHint}</p>
            <p className="portal-feed-empty-note">{earlyStageCopy.feedEmptyCta}</p>
          </div>
        ) : null}

        {loadMoreError ? (
          <div className="portal-feed-error portal-feed-error--inline">
            <p className="portal-alert portal-alert--warning" role="alert">
              {loadMoreError}
            </p>
            <button
              type="button"
              className="portal-btn portal-btn--outline portal-btn--compact"
              onClick={() => void loadMorePosts()}
            >
              Retry
            </button>
          </div>
        ) : null}

        {!isLoadingPosts && hasMore ? (
          <button
            type="button"
            className="portal-btn portal-btn--outline portal-feed-load-more"
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
