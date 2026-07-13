import { useCallback, useEffect, useState } from "react";
import { fetchOwnMemberProfile } from "../../lib/memberProfiles";
import { buildComposerAuthor } from "../../lib/portalProfileDisplay";
import { resolveMemberProfileMedia } from "../../lib/memberProfileMedia";
import { FeedComposer } from "./FeedComposer";
import { usePortalToast } from "./PortalToastProvider";

type PortalComposeProps = {
  onPosted?: () => void;
};

export function PortalCompose({ onPosted }: PortalComposeProps) {
  const { showToast } = usePortalToast();
  const [composerAuthor, setComposerAuthor] = useState(() => buildComposerAuthor(null));

  const loadAuthor = useCallback(async () => {
    const { data } = await fetchOwnMemberProfile();
    const media = await resolveMemberProfileMedia(data);
    setComposerAuthor(buildComposerAuthor(data, undefined, media));
  }, []);

  useEffect(() => {
    void loadAuthor();
  }, [loadAuthor]);

  function handlePosted() {
    showToast("Post shared");
    onPosted?.();
  }

  return (
    <section className="et-feed et-feed-compose" aria-labelledby="compose-heading">
      <header className="et-feed-hero">
        <h2 id="compose-heading" className="et-feed-title">
          Create post
        </h2>
        <p className="et-feed-lead">Share where you played, request introductions, and connect with members.</p>
      </header>
      <FeedComposer author={composerAuthor} onPosted={handlePosted} />
    </section>
  );
}
