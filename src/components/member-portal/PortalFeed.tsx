import { useCallback, useEffect, useMemo, useState } from "react";
import { earlyStageCopy } from "../../data/portalSocial";
import { getFounderWelcomePost } from "../../data/feedMockData";
import { fetchMemberFeedPosts } from "../../lib/memberFeedPosts";
import { fetchOwnMemberProfile } from "../../lib/memberProfiles";
import { getCurrentAuthUserId } from "../../lib/authUserLinking";
import { buildComposerAuthor } from "../../lib/portalProfileDisplay";
import { getPortalProfileExtras } from "../../lib/portalProfileExtras";
import { FeedCard } from "./FeedCard";
import { FeedComposer } from "./FeedComposer";
import { FoundingWelcomeBanner } from "./FoundingWelcomeBanner";
import { usePortalToast } from "./PortalToastProvider";

type PortalFeedProps = {
  showComposer?: boolean;
  composerId?: string;
};

export function PortalFeed({ showComposer = true, composerId = "feed-composer" }: PortalFeedProps) {
  const { showToast } = usePortalToast();
  const [composerAuthor, setComposerAuthor] = useState(() => buildComposerAuthor(null));
  const [memberPosts, setMemberPosts] = useState<Awaited<ReturnType<typeof fetchMemberFeedPosts>>["data"]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [postsError, setPostsError] = useState<string | null>(null);

  const loadAuthor = useCallback(async () => {
    const [{ data }, { userId }] = await Promise.all([
      fetchOwnMemberProfile(),
      getCurrentAuthUserId(),
    ]);
    const extras = getPortalProfileExtras(data?.user_id ?? userId);
    setComposerAuthor(buildComposerAuthor(data, extras));
  }, []);

  const loadPosts = useCallback(async () => {
    setIsLoadingPosts(true);
    setPostsError(null);

    const { data, error } = await fetchMemberFeedPosts();

    if (error) {
      console.error("[PortalFeed] failed to load posts", error.message);
      setPostsError("Member posts could not be loaded right now.");
      setMemberPosts([]);
    } else {
      setMemberPosts(data);
    }

    setIsLoadingPosts(false);
  }, []);

  useEffect(() => {
    void loadAuthor();
  }, [loadAuthor]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  const founderWelcome = useMemo(() => getFounderWelcomePost(), []);
  const hasMemberPosts = memberPosts.length > 0;

  function handlePosted() {
    showToast("Post shared");
    void loadPosts();
  }

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
          <p className="portal-alert portal-alert--warning" role="alert">
            {postsError}
          </p>
        ) : null}

        {!isLoadingPosts && hasMemberPosts ? (
          <div className="portal-feed-list portal-feed-grid">
            {memberPosts.map((post, index) => (
              <FeedCard key={post.id} post={post} index={index + 1} onToast={showToast} />
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
      </section>
    </section>
  );
}
