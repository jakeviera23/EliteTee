import { useCallback, useEffect, useState } from "react";
import type { FeedPost } from "../../data/portalSocial";
import { fetchOwnMemberProfile } from "../../lib/memberProfiles";
import { buildComposerAuthor } from "../../lib/portalProfileDisplay";
import { getPortalProfileExtras } from "../../lib/portalProfileExtras";
import { PostComposer } from "./PostComposer";
import { usePortalToast } from "./PortalToastProvider";

type PortalComposeProps = {
  onPost: (post: FeedPost) => void;
  onPosted?: () => void;
};

export function PortalCompose({ onPost, onPosted }: PortalComposeProps) {
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
    onPosted?.();
  }

  return (
    <section className="portal-social-page portal-compose-page" aria-labelledby="compose-heading">
      <header className="portal-section-head portal-section-head--social portal-section-head--compact">
        <h2 id="compose-heading">Create Post</h2>
        <p>Share where you played and who you played with.</p>
      </header>
      <PostComposer author={composerAuthor} onPost={handlePost} />
    </section>
  );
}
