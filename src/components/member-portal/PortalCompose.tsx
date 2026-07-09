import { useCallback, useEffect, useState } from "react";
import { fetchOwnMemberProfile } from "../../lib/memberProfiles";
import { buildComposerAuthor } from "../../lib/portalProfileDisplay";
import { getPortalProfileExtras } from "../../lib/portalProfileExtras";
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
    const extras = getPortalProfileExtras(data?.user_id);
    setComposerAuthor(buildComposerAuthor(data, extras));
  }, []);

  useEffect(() => {
    void loadAuthor();
  }, [loadAuthor]);

  function handlePosted() {
    showToast("Post shared");
    onPosted?.();
  }

  return (
    <section className="portal-social-page portal-compose-page" aria-labelledby="compose-heading">
      <header className="portal-section-head portal-section-head--social portal-section-head--compact">
        <h2 id="compose-heading">Create Post</h2>
        <p>Share where you played, request introductions, and connect with founding members.</p>
      </header>
      <FeedComposer author={composerAuthor} onPosted={handlePosted} />
    </section>
  );
}
