import { useCallback, useEffect, useState } from "react";
import type { FeedPost } from "../../data/portalSocial";
import { earlyStageCopy } from "../../data/portalSocial";
import { fetchOwnMemberProfile } from "../../lib/memberProfiles";
import { buildComposerAuthor } from "../../lib/portalProfileDisplay";
import { getPortalProfileExtras } from "../../lib/portalProfileExtras";
import { FeedPostCard } from "./FeedPostCard";
import { MemberSnapshotCard } from "./MemberSnapshotCard";
import { PostComposer } from "./PostComposer";
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
        <p className="portal-early-badge">{earlyStageCopy.earlyCommunity}</p>
      </header>

      <div className="portal-feed-top">
        <MemberSnapshotCard />
        {showComposer ? (
          <PostComposer id={composerId} author={composerAuthor} onPost={handlePost} />
        ) : null}
      </div>

      <section className="portal-feed-activity" aria-labelledby="latest-activity-heading">
        <h3 id="latest-activity-heading" className="portal-feed-activity-title">
          Latest Activity
        </h3>
        <div className="portal-feed-list portal-feed-list--polished">
          {posts.length > 0 ? (
            posts.map((post) => <FeedPostCard key={post.id} post={post} onToast={showToast} />)
          ) : (
            <div className="portal-empty portal-empty--social">
              <h3>{earlyStageCopy.earlyCommunity}</h3>
              <p>{earlyStageCopy.feedEmpty}</p>
              <p className="portal-empty-note">{earlyStageCopy.beAmongFirst}</p>
            </div>
          )}
        </div>
      </section>
    </section>
  );
}
