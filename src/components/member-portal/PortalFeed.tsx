import { useCallback, useEffect, useMemo, useState } from "react";
import type { FeedPost } from "../../data/portalSocial";
import { earlyStageCopy } from "../../data/portalSocial";
import { getFounderWelcomePost } from "../../data/feedMockData";
import { fetchOwnMemberProfile } from "../../lib/memberProfiles";
import { buildComposerAuthor } from "../../lib/portalProfileDisplay";
import { getPortalProfileExtras } from "../../lib/portalProfileExtras";
import { FeedCard } from "./FeedCard";
import { FeedComposer } from "./FeedComposer";
import { FoundingWelcomeBanner } from "./FoundingWelcomeBanner";
import { usePortalToast } from "./PortalToastProvider";

type PortalFeedProps = {
  posts: FeedPost[];
  onPost: (post: FeedPost) => void;
  showComposer?: boolean;
  composerId?: string;
};

export function PortalFeed({ posts, onPost, showComposer = true, composerId = "feed-composer" }: PortalFeedProps) {
  const { showToast } = usePortalToast();
  const [composerAuthor, setComposerAuthor] = useState(() => buildComposerAuthor(null));

  const loadAuthor = useCallback(async () => {
    const { data } = await fetchOwnMemberProfile();
    const extras = getPortalProfileExtras(data?.user_id);
    setComposerAuthor(buildComposerAuthor(data, extras));
  }, []);

  useEffect(() => {
    void loadAuthor();
  }, [loadAuthor]);

  const founderWelcome = useMemo(() => getFounderWelcomePost(), []);
  const hasMemberPosts = posts.length > 0;

  function handlePost(post: FeedPost) {
    onPost(post);
    showToast("Post shared");
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
          <FeedComposer id={composerId} author={composerAuthor} onPost={handlePost} />
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

        {hasMemberPosts ? (
          <div className="portal-feed-list portal-feed-grid">
            {posts.map((post, index) => (
              <FeedCard key={post.id} post={post} index={index} onToast={showToast} />
            ))}
          </div>
        ) : null}

        <div className="portal-feed-list portal-feed-grid portal-feed-list--founder">
          <FeedCard post={founderWelcome} index={0} onToast={showToast} />
        </div>

        {!hasMemberPosts ? (
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
