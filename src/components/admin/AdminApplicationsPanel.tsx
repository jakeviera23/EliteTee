import { useMemo, useState } from "react";
import { adminCopy } from "../../data/adminCopy";
import type { AdminOnboardingSnapshot } from "../../lib/adminOnboarding";
import type { MembershipApplicationWithReferrer } from "../../lib/adminApplicationReferrals";
import { AdminApplicationCard } from "./AdminApplicationCard";

type ApprovedApplicationsFilter = "all" | "needs_attention";

type AdminApplicationsPanelProps = {
  pendingApplications: MembershipApplicationWithReferrer[];
  approvedApplications: MembershipApplicationWithReferrer[];
  getOnboardingSnapshot: (application: MembershipApplicationWithReferrer) => AdminOnboardingSnapshot;
  needsAttentionCount: number;
  isLoading: boolean;
  pendingLoadWarning: string | null;
  approvedLoadWarning: string | null;
  applicationMessage: string | null;
  applicationError: string | null;
  applicationActionId: string | null;
  inviteActionId: string | null;
  onApprove: (applicationId: string) => void;
  onDecline: (applicationId: string) => void;
  onView: (application: MembershipApplicationWithReferrer) => void;
  onCopyInvite: (application: MembershipApplicationWithReferrer) => void;
  onCopyInvitationEmail: (application: MembershipApplicationWithReferrer) => void;
  onViewInvitation: (application: MembershipApplicationWithReferrer) => void;
  onRegenerateInvite: (applicationId: string) => void;
};

function ApprovedApplicationCard({
  application,
  onboardingSnapshot,
  inviteActionId,
  onView,
  onCopyInvite,
  onCopyInvitationEmail,
  onViewInvitation,
  onRegenerateInvite,
}: {
  application: MembershipApplicationWithReferrer;
  onboardingSnapshot: AdminOnboardingSnapshot;
  inviteActionId: string | null;
  onView: (application: MembershipApplicationWithReferrer) => void;
  onCopyInvite: (application: MembershipApplicationWithReferrer) => void;
  onCopyInvitationEmail: (application: MembershipApplicationWithReferrer) => void;
  onViewInvitation: (application: MembershipApplicationWithReferrer) => void;
  onRegenerateInvite: (applicationId: string) => void;
}) {
  const hasCopyableInvite =
    onboardingSnapshot.inviteStatus === "valid" || onboardingSnapshot.inviteStatus === "expired";

  return (
    <AdminApplicationCard
      application={application}
      variant="approved"
      onboardingSnapshot={onboardingSnapshot}
      isInviteActionPending={inviteActionId === application.id}
      onView={() => onView(application)}
      onCopyInvite={hasCopyableInvite ? () => onCopyInvite(application) : undefined}
      onCopyInvitationEmail={
        hasCopyableInvite ? () => onCopyInvitationEmail(application) : undefined
      }
      onViewInvitation={
        onboardingSnapshot.inviteStatus === "valid"
          ? () => onViewInvitation(application)
          : undefined
      }
      onRegenerateInvite={
        onboardingSnapshot.inviteStatus === "missing" ||
        onboardingSnapshot.inviteStatus === "expired"
          ? () => onRegenerateInvite(application.id)
          : undefined
      }
    />
  );
}

export function AdminApplicationsPanel({
  pendingApplications,
  approvedApplications,
  getOnboardingSnapshot,
  needsAttentionCount,
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
  onCopyInvitationEmail,
  onViewInvitation,
  onRegenerateInvite,
}: AdminApplicationsPanelProps) {
  const [approvedFilter, setApprovedFilter] = useState<ApprovedApplicationsFilter>("all");

  const filteredApprovedApplications = useMemo(() => {
    if (approvedFilter === "needs_attention") {
      return approvedApplications.filter(
        (application) => getOnboardingSnapshot(application).needsAttention,
      );
    }
    return approvedApplications;
  }, [approvedApplications, approvedFilter, getOnboardingSnapshot]);

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

      {needsAttentionCount > 0 ? (
        <section
          className="et-admin-section et-admin-section--attention"
          aria-labelledby="admin-needs-attention-heading"
        >
          <header className="et-admin-section-head">
            <h2 id="admin-needs-attention-heading">{adminCopy.applications.needsAttentionTitle}</h2>
            <p>{adminCopy.applications.needsAttentionLead}</p>
          </header>

          {isLoading ? (
            <p className="et-admin-empty">{adminCopy.loading}</p>
          ) : (
            <div className="et-admin-card-grid">
              {approvedApplications
                .filter((application) => getOnboardingSnapshot(application).needsAttention)
                .map((application) => (
                  <ApprovedApplicationCard
                    key={`attention-${application.id}`}
                    application={application}
                    onboardingSnapshot={getOnboardingSnapshot(application)}
                    inviteActionId={inviteActionId}
                    onView={onView}
                    onCopyInvite={onCopyInvite}
                    onCopyInvitationEmail={onCopyInvitationEmail}
                    onViewInvitation={onViewInvitation}
                    onRegenerateInvite={onRegenerateInvite}
                  />
                ))}
            </div>
          )}
        </section>
      ) : null}

      <section className="et-admin-section" aria-labelledby="admin-approved-heading">
        <header className="et-admin-section-head">
          <div className="et-admin-section-head-row">
            <div>
              <h2 id="admin-approved-heading">{adminCopy.applications.approvedTitle}</h2>
              <p>{adminCopy.applications.approvedLead}</p>
            </div>
            <div className="et-admin-filter et-admin-filter--inline">
              <label htmlFor="approved-onboarding-filter">{adminCopy.applications.filterLabel}</label>
              <select
                id="approved-onboarding-filter"
                value={approvedFilter}
                onChange={(event) =>
                  setApprovedFilter(event.target.value as ApprovedApplicationsFilter)
                }
              >
                <option value="all">{adminCopy.applications.filterAllApproved}</option>
                <option value="needs_attention">{adminCopy.applications.filterNeedsAttention}</option>
              </select>
            </div>
          </div>
        </header>

        {approvedLoadWarning ? (
          <p className="et-admin-alert et-admin-alert--warning" role="alert">
            {approvedLoadWarning}
          </p>
        ) : null}

        {isLoading ? (
          <p className="et-admin-empty">{adminCopy.loading}</p>
        ) : filteredApprovedApplications.length === 0 ? (
          <div className="et-admin-empty-card">
            <p className="et-admin-empty-title">
              {approvedFilter === "needs_attention"
                ? adminCopy.applications.emptyNeedsAttentionTitle
                : adminCopy.applications.emptyApprovedTitle}
            </p>
            <p>
              {approvedFilter === "needs_attention"
                ? adminCopy.applications.emptyNeedsAttentionCopy
                : adminCopy.applications.emptyApprovedCopy}
            </p>
          </div>
        ) : (
          <div className="et-admin-card-grid">
            {filteredApprovedApplications.map((application) => (
              <ApprovedApplicationCard
                key={application.id}
                application={application}
                onboardingSnapshot={getOnboardingSnapshot(application)}
                inviteActionId={inviteActionId}
                onView={onView}
                onCopyInvite={onCopyInvite}
                onCopyInvitationEmail={onCopyInvitationEmail}
                onViewInvitation={onViewInvitation}
                onRegenerateInvite={onRegenerateInvite}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
