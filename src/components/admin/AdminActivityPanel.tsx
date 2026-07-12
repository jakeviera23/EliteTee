import { adminCopy } from "../../data/adminCopy";
import type { MembershipApplicationRecord } from "../../types/membershipApplication";
import type { AdminMemberRow } from "../../lib/memberProfiles";

type AdminActivityPanelProps = {
  recentMembers: AdminMemberRow[];
  approvedApplications: MembershipApplicationRecord[];
  isLoading: boolean;
};

function formatAdminDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function AdminActivityPanel({
  recentMembers,
  approvedApplications,
  isLoading,
}: AdminActivityPanelProps) {
  const recentApprovals = approvedApplications.slice(0, 5);

  return (
    <div className="et-admin-stack">
      <header className="et-admin-section-head">
        <h2>{adminCopy.activity.title}</h2>
        <p>{adminCopy.activity.lead}</p>
      </header>

      {isLoading ? (
        <p className="et-admin-empty">{adminCopy.loading}</p>
      ) : (
        <>
          <section className="et-admin-section" aria-labelledby="admin-activity-members-heading">
            <header className="et-admin-section-head">
              <h3 id="admin-activity-members-heading">{adminCopy.activity.recentMembers}</h3>
            </header>
            {recentMembers.length === 0 ? (
              <p className="et-admin-empty">{adminCopy.activity.emptyMembers}</p>
            ) : (
              <ul className="et-admin-activity-list">
                {recentMembers.slice(0, 5).map((member) => (
                  <li key={member.id}>
                    <strong>{member.full_name}</strong>
                    <span>
                      {member.membership_status} · {formatAdminDate(member.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="et-admin-section" aria-labelledby="admin-activity-approvals-heading">
            <header className="et-admin-section-head">
              <h3 id="admin-activity-approvals-heading">{adminCopy.activity.recentApprovals}</h3>
            </header>
            {recentApprovals.length === 0 ? (
              <p className="et-admin-empty">{adminCopy.activity.emptyApprovals}</p>
            ) : (
              <ul className="et-admin-activity-list">
                {recentApprovals.map((application) => (
                  <li key={application.id}>
                    <strong>{application.full_name}</strong>
                    <span>
                      {application.founding_member_number || "Approved"} ·{" "}
                      {formatAdminDate(application.reviewed_at ?? application.applied_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="et-admin-section et-admin-section--muted" aria-labelledby="admin-activity-unavailable-heading">
            <header className="et-admin-section-head">
              <h3 id="admin-activity-unavailable-heading">{adminCopy.activity.unavailableTitle}</h3>
            </header>
            <p>{adminCopy.activity.unavailableCopy}</p>
          </section>
        </>
      )}
    </div>
  );
}
