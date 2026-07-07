import { useCallback, useEffect, useMemo, useState } from "react";
import type { FeedPost } from "../../data/portalSocial";
import { getMockFeedPosts } from "../../data/feedMockData";
import { fetchOwnMemberProfile } from "../../lib/memberProfiles";
import { buildComposerAuthor } from "../../lib/portalProfileDisplay";
import { getPortalProfileExtras } from "../../lib/portalProfileExtras";
import { FeedCard } from "./FeedCard";
import { FeedComposer } from "./FeedComposer";
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

  // Member-created posts appear first, followed by the sample community feed.
  // The mock data is shaped like a future Supabase query result.
  const feedItems = useMemo(() => [...posts, ...getMockFeedPosts()], [posts]);

  function handlePost(post: FeedPost) {
    onPost(post);
    showToast("Round shared");
  }

  return (
    <section className="portal-social-page portal-feed-page" aria-labelledby="feed-heading">
      <header className="portal-section-head portal-section-head--social portal-section-head--compact">
        <h2 id="feed-heading">Feed</h2>
        <p>
          A curated golf community for serious golfers to share rounds, discover courses, and build
          trusted relationships through the game.
        </p>
      </header>

      {showComposer ? (
        <div className="portal-feed-top">
          <FeedComposer id={composerId} author={composerAuthor} onPost={handlePost} />
          <p className="feed-composer-helper">
            Use the feed to share rounds, find games while traveling, request introductions, and
            connect through golf.
          </p>
        </div>
      ) : null}

      <section className="portal-feed-activity" aria-labelledby="latest-activity-heading">
        <h3 id="latest-activity-heading" className="portal-feed-activity-title">
          Latest Activity
        </h3>
        <div className="portal-feed-list portal-feed-grid">
          {feedItems.map((post, index) => (
            <FeedCard key={post.id} post={post} index={index} onToast={showToast} />
          ))}
        </div>
      </section>
    </section>
  );
}
