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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

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

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadReferral();
  }, [loadReferral]);

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

  const sectionClassName =
    variant === "compact"
      ? "et-invite-golfer et-invite-golfer--compact et-profile-section"
      : "et-invite-golfer et-profile-section";

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
        <button type="button" className="et-btn et-btn--secondary" onClick={() => void loadReferral()}>
          Try again
        </button>
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
          EliteTee grows through golfers you trust. Invite someone you&apos;d genuinely want to meet,
          play with, or have in the network.
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
      </div>

      <p className="et-invite-golfer-stats">
        {pendingCount} Pending · {joinedCount} Joined
      </p>
    </section>
  );
}
