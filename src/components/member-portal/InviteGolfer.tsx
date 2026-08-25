import { useCallback, useEffect, useState } from "react";
import { fetchMemberReferralInvite, fetchMemberReferralStats } from "../../lib/memberReferrals";
import { memberFacingPortalError } from "../../lib/portalErrorDisplay";
import { usePortalToast } from "./PortalToastProvider";

type InviteGolferProps = {
  /** Compact layout for Discover; full layout for Profile. */
  variant?: "compact" | "full";
};

export function InviteGolfer({ variant = "full" }: InviteGolferProps) {
  const { showToast } = usePortalToast();
  const [referralUrl, setReferralUrl] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [joinedCount, setJoinedCount] = useState(0);
  const [loading, setLoading] = useState(variant === "full");
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [expanded, setExpanded] = useState(variant === "full");
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadReferral = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [inviteResult, statsResult] = await Promise.all([
      fetchMemberReferralInvite(),
      fetchMemberReferralStats(),
    ]);

    if (inviteResult.error) {
      setError(
        memberFacingPortalError(inviteResult.error.message ?? "Unable to load invite link.", "general"),
      );
      setReferralUrl(null);
    } else {
      setReferralUrl(inviteResult.data?.referralUrl ?? null);
    }

    if (!statsResult.error && statsResult.data) {
      setPendingCount(statsResult.data.pendingCount);
      setJoinedCount(statsResult.data.joinedCount);
    }

    setHasLoaded(true);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (variant === "full") {
      void loadReferral();
    }
  }, [loadReferral, variant]);

  useEffect(() => {
    if (variant === "compact" && expanded && !hasLoaded) {
      void loadReferral();
    }
  }, [expanded, hasLoaded, loadReferral, variant]);

  async function handleCopyLink() {
    if (!referralUrl) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(referralUrl);
      } else {
        throw new Error("Clipboard unavailable");
      }
      showToast("Link copied");
    } catch {
      showToast("Could not copy link");
    }
  }

  async function handleShare() {
    if (!referralUrl) return;

    const shareText = `Join me on EliteTee — a curated golf community for serious golfers.\n\n${referralUrl}`;
    setSharing(true);

    try {
      if (navigator.share) {
        await navigator.share({
          title: "EliteTee",
          text: shareText,
          url: referralUrl,
        });
        return;
      }

      await handleCopyLink();
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") {
        return;
      }
      await handleCopyLink();
    } finally {
      setSharing(false);
    }
  }

  const isCompact = variant === "compact";
  const sectionClassName = [
    "et-invite-golfer",
    "et-profile-section",
    isCompact ? "et-invite-golfer--compact" : "",
    isCompact && !expanded ? "et-invite-golfer--collapsed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (isCompact && !expanded) {
    return (
      <section className={sectionClassName} aria-labelledby="invite-golfer-heading">
        <div className="et-invite-golfer-cta">
          <div className="et-invite-golfer-cta-copy">
            <h3 id="invite-golfer-heading" className="et-invite-golfer-cta-title">
              Invite a Golfer
            </h3>
            <p className="et-invite-golfer-cta-lead">Know a golfer who belongs in EliteTee?</p>
          </div>
          <button
            type="button"
            className="et-btn et-btn--forest"
            onClick={() => setExpanded(true)}
          >
            Invite a Golfer
          </button>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className={sectionClassName} aria-labelledby="invite-golfer-heading">
        <p className="et-invite-golfer-loading">Loading invite link…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className={sectionClassName} aria-labelledby="invite-golfer-heading">
        <header className="et-profile-section-head">
          <h3 id="invite-golfer-heading" className="et-profile-section-title">
            Invite a Golfer
          </h3>
        </header>
        <p className="et-invite-golfer-error" role="alert">
          {error}
        </p>
        <div className="et-invite-golfer-actions">
          <button type="button" className="et-btn et-btn--secondary" onClick={() => void loadReferral()}>
            Try again
          </button>
          {isCompact ? (
            <button type="button" className="et-btn et-btn--ghost" onClick={() => setExpanded(false)}>
              Close
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className={sectionClassName} aria-labelledby="invite-golfer-heading">
      <header className="et-profile-section-head">
        <h3 id="invite-golfer-heading" className="et-profile-section-title">
          Invite a Golfer
        </h3>
        <p className="et-profile-section-lead">
          {isCompact
            ? "Know a golfer who belongs in EliteTee? Share your personal invite link."
            : "EliteTee grows through golfers you trust. Invite someone you'd genuinely want to meet, play with, or have in the network."}
        </p>
      </header>

      {referralUrl ? (
        <button type="button" className="et-invite-golfer-link" onClick={() => void handleCopyLink()}>
          <span className="et-invite-golfer-link-label">Your invite link</span>
          <span className="et-invite-golfer-link-url">{referralUrl}</span>
        </button>
      ) : null}

      <div className="et-invite-golfer-actions">
        <button
          type="button"
          className="et-btn et-btn--secondary"
          disabled={!referralUrl}
          onClick={() => void handleCopyLink()}
        >
          Copy Link
        </button>
        <button
          type="button"
          className="et-btn et-btn--forest"
          disabled={!referralUrl || sharing}
          onClick={() => void handleShare()}
        >
          {sharing ? "Sharing…" : "Share"}
        </button>
        {isCompact ? (
          <button type="button" className="et-btn et-btn--ghost" onClick={() => setExpanded(false)}>
            Close
          </button>
        ) : null}
      </div>

      <p className="et-invite-golfer-stats">
        {pendingCount} Pending · {joinedCount} Joined
      </p>
    </section>
  );
}
