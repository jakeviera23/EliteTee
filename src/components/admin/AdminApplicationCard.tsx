import { adminCopy } from "../../data/adminCopy";
import { formatApplicationReferrerLine } from "../../lib/adminApplicationReferrals";
import { truncateAdminText } from "../../lib/adminDashboard";
import type { MembershipApplicationWithReferrer } from "../../lib/adminApplicationReferrals";

type AdminApplicationCardProps = {
  application: MembershipApplicationWithReferrer;
  variant: "pending" | "approved";
  isActionPending?: boolean;
  isInviteActionPending?: boolean;
  onApprove?: () => void;
  onDecline?: () => void;
  onView: () => void;
  onCopyInvite?: () => void;
  onCopyInvitationEmail?: () => void;
  onViewInvitation?: () => void;
  onRegenerateInvite?: () => void;
  inviteStatus?: "ready" | "redeemed" | "missing";
};

function formatAdminDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function AdminApplicationCard({
  application,
  variant,
  isActionPending = false,
  isInviteActionPending = false,
  onApprove,
  onDecline,
  onView,
  onCopyInvite,
  onCopyInvitationEmail,
  onViewInvitation,
  onRegenerateInvite,
  inviteStatus,
}: AdminApplicationCardProps) {
  const referrerLine = formatApplicationReferrerLine(application.referrer_display);
  const statusBadge =
    variant === "pending"
      ? adminCopy.applications.pendingBadge
      : application.status === "declined"
        ? adminCopy.applications.declinedBadge
        : adminCopy.applications.approvedBadge;

  return (
    <article className={`et-admin-app-card et-admin-app-card--${variant}`}>
      <header className="et-admin-app-card-head">
        <div className="et-admin-app-card-identity">
          <h3 className="et-admin-app-card-name">{application.full_name}</h3>
          <p className="et-admin-app-card-email">{application.email}</p>
        </div>
        <span
          className={`et-admin-badge${
            variant === "pending"
              ? " et-admin-badge--gold"
              : application.status === "declined"
                ? " et-admin-badge--burgundy"
                : " et-admin-badge--forest"
          }`}
        >
          {statusBadge}
        </span>
      </header>

      <dl className="et-admin-app-card-meta">
        <div>
          <dt>Location</dt>
          <dd>{application.location || "—"}</dd>
        </div>
        <div>
          <dt>Home club</dt>
          <dd>{application.home_club || "—"}</dd>
        </div>
        <div>
          <dt>Applied</dt>
          <dd>{formatAdminDate(application.applied_at)}</dd>
        </div>
        {application.founding_member_number ? (
          <div>
            <dt>FM #</dt>
            <dd>{application.founding_member_number}</dd>
          </div>
        ) : null}
        {referrerLine ? (
          <div className="et-admin-app-card-meta-wide">
            <dt>Referral</dt>
            <dd>
              <span className="et-admin-badge et-admin-badge--forest">Member referral</span>
              <span className="et-admin-app-card-referrer">
                Referred by: {referrerLine}
              </span>
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="et-admin-app-card-copy">
        <p>
          <span className="et-admin-app-card-copy-label">Golf background</span>
          {truncateAdminText(application.golf_love)}
        </p>
        <p>
          <span className="et-admin-app-card-copy-label">Why EliteTee</span>
          {truncateAdminText(application.why_join)}
        </p>
      </div>

      {variant === "approved" && inviteStatus ? (
        <p className="et-admin-app-card-invite">
          Invite:{" "}
          <span
            className={`et-admin-badge${
              inviteStatus === "redeemed"
                ? " et-admin-badge--forest"
                : inviteStatus === "ready"
                  ? " et-admin-badge--gold"
                  : " et-admin-badge--burgundy"
            }`}
          >
            {inviteStatus === "redeemed"
              ? adminCopy.invites.redeemed
              : inviteStatus === "ready"
                ? adminCopy.invites.linkReady
                : adminCopy.invites.linkMissing}
          </span>
        </p>
      ) : null}

      <div className="et-admin-app-card-actions">
        {variant === "pending" ? (
          <>
            <button
              type="button"
              className="et-btn et-btn--forest"
              disabled={isActionPending}
              onClick={onApprove}
            >
              {isActionPending ? adminCopy.applications.approving : adminCopy.applications.approve}
            </button>
            <button
              type="button"
              className="et-btn et-btn--ghost et-admin-btn-destructive"
              disabled={isActionPending}
              onClick={onDecline}
            >
              {adminCopy.applications.decline}
            </button>
          </>
        ) : null}

        {variant === "approved" && inviteStatus === "ready" && onCopyInvite ? (
          <button type="button" className="et-btn et-btn--forest" onClick={onCopyInvite}>
            {adminCopy.invites.copyLink}
          </button>
        ) : null}

        {variant === "approved" && inviteStatus === "ready" && onCopyInvitationEmail ? (
          <button type="button" className="et-btn et-btn--secondary" onClick={onCopyInvitationEmail}>
            {adminCopy.invites.copyInvitationEmail}
          </button>
        ) : null}

        {variant === "approved" && inviteStatus === "ready" && onViewInvitation ? (
          <button type="button" className="et-btn et-btn--secondary" onClick={onViewInvitation}>
            {adminCopy.invites.viewInvitation}
          </button>
        ) : null}

        {variant === "approved" && inviteStatus === "missing" && onRegenerateInvite ? (
          <button
            type="button"
            className="et-btn et-btn--secondary"
            disabled={isInviteActionPending}
            onClick={onRegenerateInvite}
          >
            {isInviteActionPending ? adminCopy.invites.regenerating : adminCopy.invites.regenerate}
          </button>
        ) : null}

        <button type="button" className="et-btn et-btn--secondary" onClick={onView}>
          {adminCopy.applications.viewApplication}
        </button>
      </div>
    </article>
  );
}
