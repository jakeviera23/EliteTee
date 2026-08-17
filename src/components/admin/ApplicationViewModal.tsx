import type { MembershipApplicationRecord } from "../../types/membershipApplication";
import { getInvitationEmailDraftForApplication } from "../../lib/adminMemberInvites";
import {
  copyInviteLinkToClipboard,
  getApplicationInviteLink,
} from "../../lib/membershipInvites";

type ApplicationViewModalProps = {
  application: MembershipApplicationRecord;
  onClose: () => void;
  onRegenerateInvite?: (applicationId: string) => void;
  onViewInvitation?: (application: MembershipApplicationRecord) => void;
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
  onViewInvitation,
  isRegeneratingInvite = false,
}: ApplicationViewModalProps) {
  const isApproved = application.status === "approved";
  const inviteLink = isApproved ? getApplicationInviteLink(application) : null;
  const inviteRedeemed = Boolean(application.invite_redeemed_at);
  const invitationEmailDraft = inviteLink ? getInvitationEmailDraftForApplication(application) : null;

  async function handleCopyInviteLink() {
    if (!inviteLink) return;
    await copyInviteLinkToClipboard(inviteLink);
  }

  async function handleCopyInvitationEmail() {
    if (!invitationEmailDraft) return;
    await copyInviteLinkToClipboard(invitationEmailDraft);
  }

  return (
    <div className="et-admin-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="et-admin-modal"
        role="dialog"
        aria-labelledby="application-view-title"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="et-admin-modal-head">
          <h3 id="application-view-title">Membership application</h3>
          <button type="button" className="et-admin-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <dl className="et-admin-application-details">
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
            <dt>Home course</dt>
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
              <dt>Founding member #</dt>
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
            <dd>{application.status.replace("_", " ")}</dd>
          </div>
          <div className="et-admin-application-details-wide">
            <dt>What they love about golf</dt>
            <dd>{application.golf_love}</dd>
          </div>
          <div className="et-admin-application-details-wide">
            <dt>Why they want to join</dt>
            <dd>{application.why_join}</dd>
          </div>
        </dl>

        {isApproved ? (
          <div className="et-admin-invite-panel">
            <h4>Private invite link</h4>
            {inviteRedeemed ? (
              <p className="et-admin-note">
                Invite redeemed on {formatDate(application.invite_redeemed_at ?? "")}.
              </p>
            ) : inviteLink ? (
              <>
                <p className="et-admin-invitation-link">
                  <span>Invite link</span>
                  <a href={inviteLink} target="_blank" rel="noreferrer">
                    {inviteLink}
                  </a>
                </p>
                <div className="et-admin-modal-actions">
                  <button
                    type="button"
                    className="et-btn et-btn--secondary"
                    onClick={() => void handleCopyInviteLink()}
                  >
                    Copy invite link
                  </button>
                  {invitationEmailDraft ? (
                    <button
                      type="button"
                      className="et-btn et-btn--secondary"
                      onClick={() => void handleCopyInvitationEmail()}
                    >
                      Copy invitation email
                    </button>
                  ) : null}
                  {onViewInvitation ? (
                    <button
                      type="button"
                      className="et-btn et-btn--forest"
                      onClick={() => onViewInvitation(application)}
                    >
                      View invitation
                    </button>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <p className="et-admin-alert et-admin-alert--warning" role="status">
                  Invite link missing
                </p>
                {onRegenerateInvite ? (
                  <button
                    type="button"
                    className="et-btn et-btn--forest"
                    disabled={isRegeneratingInvite}
                    onClick={() => onRegenerateInvite(application.id)}
                  >
                    {isRegeneratingInvite ? "Regenerating…" : "Regenerate invite link"}
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
