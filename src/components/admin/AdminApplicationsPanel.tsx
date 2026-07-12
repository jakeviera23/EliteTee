import { adminCopy } from "../../data/adminCopy";
import { getApplicationInviteStatus } from "../../lib/adminDashboard";
import type { MembershipApplicationRecord } from "../../types/membershipApplication";
import { AdminApplicationCard } from "./AdminApplicationCard";

type AdminApplicationsPanelProps = {
  pendingApplications: MembershipApplicationRecord[];
  approvedApplications: MembershipApplicationRecord[];
  isLoading: boolean;
  pendingLoadWarning: string | null;
  approvedLoadWarning: string | null;
  applicationMessage: string | null;
  applicationError: string | null;
  applicationActionId: string | null;
  inviteActionId: string | null;
  onApprove: (applicationId: string) => void;
  onDecline: (applicationId: string) => void;
  onView: (application: MembershipApplicationRecord) => void;
  onCopyInvite: (application: MembershipApplicationRecord) => void;
  onRegenerateInvite: (applicationId: string) => void;
};

export function AdminApplicationsPanel({
  pendingApplications,
  approvedApplications,
  isLoading,
  pendingLoadWarning,
  approvedLoadWarning,
  applicationMessage,
  applicationError,
  applicationActionId,
  inviteActionId,
  onApprove,
  onDecline,
  onView,
  onCopyInvite,
  onRegenerateInvite,
}: AdminApplicationsPanelProps) {
  return (
    <div className="et-admin-stack">
      {applicationMessage ? (
        <p className="et-admin-alert et-admin-alert--success" role="status">
          {applicationMessage}
        </p>
      ) : null}
      {applicationError ? (
        <p className="et-admin-alert et-admin-alert--error" role="alert">
          {applicationError}
        </p>
      ) : null}

      <section className="et-admin-section" aria-labelledby="admin-pending-heading">
        <header className="et-admin-section-head">
          <h2 id="admin-pending-heading">{adminCopy.applications.pendingTitle}</h2>
          <p>{adminCopy.applications.pendingLead}</p>
        </header>

        {pendingLoadWarning ? (
          <p className="et-admin-alert et-admin-alert--warning" role="alert">
            {pendingLoadWarning}
          </p>
        ) : null}

        {isLoading ? (
          <p className="et-admin-empty">{adminCopy.loading}</p>
        ) : pendingApplications.length === 0 ? (
          <div className="et-admin-empty-card">
            <p className="et-admin-empty-title">{adminCopy.applications.emptyPendingTitle}</p>
            <p>{adminCopy.applications.emptyPendingCopy}</p>
          </div>
        ) : (
          <div className="et-admin-card-grid">
            {pendingApplications.map((application) => (
              <AdminApplicationCard
                key={application.id}
                application={application}
                variant="pending"
                isActionPending={applicationActionId === application.id}
                onApprove={() => onApprove(application.id)}
                onDecline={() => onDecline(application.id)}
                onView={() => onView(application)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="et-admin-section" aria-labelledby="admin-approved-heading">
        <header className="et-admin-section-head">
          <h2 id="admin-approved-heading">{adminCopy.applications.approvedTitle}</h2>
          <p>{adminCopy.applications.approvedLead}</p>
        </header>

        {approvedLoadWarning ? (
          <p className="et-admin-alert et-admin-alert--warning" role="alert">
            {approvedLoadWarning}
          </p>
        ) : null}

        {isLoading ? (
          <p className="et-admin-empty">{adminCopy.loading}</p>
        ) : approvedApplications.length === 0 ? (
          <div className="et-admin-empty-card">
            <p className="et-admin-empty-title">{adminCopy.applications.emptyApprovedTitle}</p>
            <p>{adminCopy.applications.emptyApprovedCopy}</p>
          </div>
        ) : (
          <div className="et-admin-card-grid">
            {approvedApplications.map((application) => {
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
    </div>
  );
}
