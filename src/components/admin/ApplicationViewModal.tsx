import type { MembershipApplicationRecord } from "../../types/membershipApplication";
import {
  copyInviteLinkToClipboard,
  getApplicationInviteLink,
} from "../../lib/membershipInvites";

type ApplicationViewModalProps = {
  application: MembershipApplicationRecord;
  onClose: () => void;
  onRegenerateInvite?: (applicationId: string) => void;
  isRegeneratingInvite?: boolean;
};

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ApplicationViewModal({
  application,
  onClose,
  onRegenerateInvite,
  isRegeneratingInvite = false,
}: ApplicationViewModalProps) {
  const isApproved = application.status === "approved";
  const inviteLink = isApproved ? getApplicationInviteLink(application) : null;
  const inviteRedeemed = Boolean(application.invite_redeemed_at);

  async function handleCopyInviteLink() {
    if (!inviteLink) return;
    await copyInviteLinkToClipboard(inviteLink);
  }

  return (
    <div className="portal-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="portal-modal portal-modal--application"
        role="dialog"
        aria-labelledby="application-view-title"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="portal-modal-head">
          <h3 id="application-view-title">Membership Application</h3>
          <button type="button" className="portal-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <dl className="admin-application-details">
          <div>
            <dt>Name</dt>
            <dd>{application.full_name}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{application.email}</dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>{application.location}</dd>
          </div>
          <div>
            <dt>Home Course</dt>
            <dd>{application.home_club}</dd>
          </div>
          {application.handicap ? (
            <div>
              <dt>Handicap</dt>
              <dd>{application.handicap}</dd>
            </div>
          ) : null}
          {application.instagram ? (
            <div>
              <dt>Instagram</dt>
              <dd>{application.instagram}</dd>
            </div>
          ) : null}
          {application.founding_member_number ? (
            <div>
              <dt>Founding Member #</dt>
              <dd>{application.founding_member_number}</dd>
            </div>
          ) : null}
          <div>
            <dt>Applied</dt>
            <dd>{formatDate(application.applied_at)}</dd>
          </div>
          {application.reviewed_at ? (
            <div>
              <dt>Reviewed</dt>
              <dd>{formatDate(application.reviewed_at)}</dd>
            </div>
          ) : null}
          <div>
            <dt>Status</dt>
            <dd className="admin-application-status">{application.status.replace("_", " ")}</dd>
          </div>
          <div className="admin-application-details-wide">
            <dt>What they love about golf</dt>
            <dd>{application.golf_love}</dd>
          </div>
          <div className="admin-application-details-wide">
            <dt>Why they want to join</dt>
            <dd>{application.why_join}</dd>
          </div>
        </dl>

        {isApproved ? (
          <div className="admin-application-invite-panel">
            <h4>Private invite link</h4>
            {inviteRedeemed ? (
              <p className="admin-application-invite-note">
                Invite redeemed on {formatDate(application.invite_redeemed_at ?? "")}.
              </p>
            ) : inviteLink ? (
              <>
                <p className="admin-invitation-link">
                  <span>Invite link</span>
                  <a href={inviteLink} target="_blank" rel="noreferrer">
                    {inviteLink}
                  </a>
                </p>
                <button
                  type="button"
                  className="portal-btn portal-btn--outline portal-btn--compact"
                  onClick={() => void handleCopyInviteLink()}
                >
                  Copy Invite Link
                </button>
              </>
            ) : (
              <>
                <p className="portal-alert portal-alert--warning" role="status">
                  Invite link missing
                </p>
                {onRegenerateInvite ? (
                  <button
                    type="button"
                    className="portal-btn portal-btn--gold portal-btn--compact"
                    disabled={isRegeneratingInvite}
                    onClick={() => onRegenerateInvite(application.id)}
                  >
                    {isRegeneratingInvite ? "Regenerating…" : "Regenerate Invite Link"}
                  </button>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
