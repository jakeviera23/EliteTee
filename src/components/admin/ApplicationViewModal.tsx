import type { MembershipApplicationWithReferrer } from "../../lib/adminApplicationReferrals";
import { formatApplicationReferrerLine } from "../../lib/adminApplicationReferrals";
import type { AdminOnboardingSnapshot } from "../../lib/adminOnboarding";
import { getInvitationEmailDraftForApplication } from "../../lib/adminMemberInvites";
import {
  copyInviteLinkToClipboard,
  getApplicationInviteLink,
} from "../../lib/membershipInvites";
import { AdminOnboardingSummary } from "./AdminOnboardingSummary";

type ApplicationViewModalProps = {
  application: MembershipApplicationWithReferrer;
  onboardingSnapshot?: AdminOnboardingSnapshot | null;
  onClose: () => void;
  onRegenerateInvite?: (applicationId: string) => void;
  onViewInvitation?: (application: MembershipApplicationWithReferrer) => void;
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
  onboardingSnapshot = null,
  onClose,
  onRegenerateInvite,
  onViewInvitation,
  isRegeneratingInvite = false,
}: ApplicationViewModalProps) {
  const isApproved = application.status === "approved";
  const inviteLink = isApproved ? getApplicationInviteLink(application) : null;
  const inviteRedeemed = Boolean(application.invite_redeemed_at);
  const detailedInviteStatus = onboardingSnapshot?.inviteStatus;
  const invitationEmailDraft = inviteLink ? getInvitationEmailDraftForApplication(application) : null;
  const referrerLine = formatApplicationReferrerLine(application.referrer_display);

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
          {referrerLine ? (
            <>
              <div>
                <dt>Referral source</dt>
                <dd>Member referral</dd>
              </div>
              <div>
                <dt>Referred by</dt>
                <dd>{referrerLine}</dd>
              </div>
              {application.referral_code_used ? (
                <div>
                  <dt>Referral code</dt>
                  <dd>{application.referral_code_used}</dd>
                </div>
              ) : null}
              {application.referral_captured_at ? (
                <div>
                  <dt>Referral captured</dt>
                  <dd>{formatDate(application.referral_captured_at)}</dd>
                </div>
              ) : null}
            </>
          ) : null}
          <div className="et-admin-application-details-wide">
            <dt>What they love about golf</dt>
            <dd>{application.golf_love}</dd>
          </div>
          <div className="et-admin-application-details-wide">
            <dt>Why they want to join</dt>
            <dd>{application.why_join}</dd>
          </div>
        </dl>

        {isApproved && onboardingSnapshot ? (
          <div className="et-admin-invite-panel">
            <h4>Onboarding status</h4>
            <AdminOnboardingSummary snapshot={onboardingSnapshot} />
          </div>
        ) : null}

        {isApproved ? (
          <div className="et-admin-invite-panel">
            <h4>Private invite link</h4>
            {inviteRedeemed ? (
              <p className="et-admin-note">
                Invite redeemed on {formatDate(application.invite_redeemed_at ?? "")}.
              </p>
            ) : inviteLink ? (
              <>
                {application.invite_token_created_at ? (
                  <p className="et-admin-note">
                    Invite created {formatDate(application.invite_token_created_at)}
                    {onboardingSnapshot?.inviteExpiresAt
                      ? ` · Expires ${formatDate(onboardingSnapshot.inviteExpiresAt)}`
                      : null}
                    {detailedInviteStatus === "expired" ? " · Expired" : null}
                  </p>
                ) : null}
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
                  {onViewInvitation && detailedInviteStatus === "valid" ? (
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

            {onboardingSnapshot ? (
              <dl className="et-admin-application-details et-admin-application-details--compact">
                <div>
                  <dt>Profile linked</dt>
                  <dd>{onboardingSnapshot.profileLinked ? "Yes" : "No"}</dd>
                </div>
                <div>
                  <dt>Portal access</dt>
                  <dd>{onboardingSnapshot.portalAccessEnabled ? "Enabled" : "Disabled"}</dd>
                </div>
                <div>
                  <dt>Membership activated</dt>
                  <dd>{onboardingSnapshot.membershipActivated ? "Yes" : "No"}</dd>
                </div>
              </dl>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
