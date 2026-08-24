import { adminCopy } from "../../data/adminCopy";
import { getApplicationInviteStatus } from "../../lib/adminDashboard";
import type { MembershipApplicationWithReferrer } from "../../lib/adminApplicationReferrals";
import { AdminApplicationCard } from "./AdminApplicationCard";

type AdminInvitesPanelProps = {
  approvedApplications: MembershipApplicationWithReferrer[];
  isLoading: boolean;
  inviteActionId: string | null;
  onView: (application: MembershipApplicationWithReferrer) => void;
  onCopyInvite: (application: MembershipApplicationWithReferrer) => void;
  onCopyInvitationEmail: (application: MembershipApplicationWithReferrer) => void;
  onViewInvitation: (application: MembershipApplicationWithReferrer) => void;
  onRegenerateInvite: (applicationId: string) => void;
};

function InviteGroup({
  title,
  emptyTitle,
  emptyCopy,
  applications,
  inviteActionId,
  onView,
  onCopyInvite,
  onCopyInvitationEmail,
  onViewInvitation,
  onRegenerateInvite,
}: {
  title: string;
  emptyTitle: string;
  emptyCopy: string;
  applications: MembershipApplicationWithReferrer[];
  inviteActionId: string | null;
  onView: (application: MembershipApplicationWithReferrer) => void;
  onCopyInvite: (application: MembershipApplicationWithReferrer) => void;
  onCopyInvitationEmail: (application: MembershipApplicationWithReferrer) => void;
  onViewInvitation: (application: MembershipApplicationWithReferrer) => void;
  onRegenerateInvite: (applicationId: string) => void;
}) {
  return (
    <section className="et-admin-section">
      <header className="et-admin-section-head">
        <h2>{title}</h2>
      </header>
      {applications.length === 0 ? (
        <div className="et-admin-empty-card">
          <p className="et-admin-empty-title">{emptyTitle}</p>
          <p>{emptyCopy}</p>
        </div>
      ) : (
        <div className="et-admin-card-grid">
          {applications.map((application) => {
            const inviteStatus = getApplicationInviteStatus(application);
            return (
              <AdminApplicationCard
                key={application.id}
                application={application}
                variant="approved"
                inviteStatus={inviteStatus}
                isInviteActionPending={inviteActionId === application.id}
                onView={() => onView(application)}
                onCopyInvite={
                  inviteStatus === "ready" ? () => onCopyInvite(application) : undefined
                }
                onCopyInvitationEmail={
                  inviteStatus === "ready" ? () => onCopyInvitationEmail(application) : undefined
                }
                onViewInvitation={
                  inviteStatus === "ready" ? () => onViewInvitation(application) : undefined
                }
                onRegenerateInvite={
                  inviteStatus === "missing"
                    ? () => onRegenerateInvite(application.id)
                    : undefined
                }
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

export function AdminInvitesPanel({
  approvedApplications,
  isLoading,
  inviteActionId,
  onView,
  onCopyInvite,
  onCopyInvitationEmail,
  onViewInvitation,
  onRegenerateInvite,
}: AdminInvitesPanelProps) {
  const awaiting = approvedApplications.filter(
    (application) => getApplicationInviteStatus(application) === "ready",
  );
  const redeemed = approvedApplications.filter(
    (application) => getApplicationInviteStatus(application) === "redeemed",
  );
  const missing = approvedApplications.filter(
    (application) => getApplicationInviteStatus(application) === "missing",
  );

  if (isLoading) {
    return <p className="et-admin-empty">{adminCopy.loading}</p>;
  }

  return (
    <div className="et-admin-stack">
      <header className="et-admin-section-head">
        <h2>{adminCopy.invites.title}</h2>
        <p>{adminCopy.invites.lead}</p>
      </header>

      <InviteGroup
        title={adminCopy.invites.awaitingTitle}
        emptyTitle={adminCopy.invites.emptyAwaitingTitle}
        emptyCopy={adminCopy.invites.emptyAwaitingCopy}
        applications={awaiting}
        inviteActionId={inviteActionId}
        onView={onView}
        onCopyInvite={onCopyInvite}
        onCopyInvitationEmail={onCopyInvitationEmail}
        onViewInvitation={onViewInvitation}
        onRegenerateInvite={onRegenerateInvite}
      />

      <InviteGroup
        title={adminCopy.invites.redeemedTitle}
        emptyTitle={adminCopy.invites.emptyRedeemedTitle}
        emptyCopy={adminCopy.invites.emptyRedeemedCopy}
        applications={redeemed}
        inviteActionId={inviteActionId}
        onView={onView}
        onCopyInvite={onCopyInvite}
        onCopyInvitationEmail={onCopyInvitationEmail}
        onViewInvitation={onViewInvitation}
        onRegenerateInvite={onRegenerateInvite}
      />

      {missing.length > 0 ? (
        <InviteGroup
          title={adminCopy.invites.missingTitle}
          emptyTitle={adminCopy.invites.linkMissing}
          emptyCopy={adminCopy.invites.regenerate}
          applications={missing}
          inviteActionId={inviteActionId}
          onView={onView}
          onCopyInvite={onCopyInvite}
          onCopyInvitationEmail={onCopyInvitationEmail}
          onViewInvitation={onViewInvitation}
          onRegenerateInvite={onRegenerateInvite}
        />
      ) : null}
    </div>
  );
}
