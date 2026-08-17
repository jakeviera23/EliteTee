import { adminCopy } from "../../data/adminCopy";
import { describeMemberOperationalState } from "../../lib/adminDashboard";
import {
  findApprovedApplicationForMember,
  memberHasRecoverableInvite,
} from "../../lib/adminMemberInvites";
import type { AdminMemberRow } from "../../lib/memberProfiles";
import type { MembershipApplicationRecord } from "../../types/membershipApplication";

type AdminMemberDirectoryProps = {
  members: AdminMemberRow[];
  approvedApplications: MembershipApplicationRecord[];
  isLoading: boolean;
  search: string;
  filter: "all" | "portal" | "awaiting" | "unverified";
  onSearchChange: (value: string) => void;
  onFilterChange: (value: "all" | "portal" | "awaiting" | "unverified") => void;
  onCopyInviteLink?: (application: MembershipApplicationRecord) => void;
  onCopyInvitationEmail?: (application: MembershipApplicationRecord) => void;
  onViewInvitation?: (application: MembershipApplicationRecord) => void;
};

function formatAdminDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function AdminMemberDirectory({
  members,
  approvedApplications,
  isLoading,
  search,
  filter,
  onSearchChange,
  onFilterChange,
  onCopyInviteLink,
  onCopyInvitationEmail,
  onViewInvitation,
}: AdminMemberDirectoryProps) {
  return (
    <section className="et-admin-section" aria-labelledby="admin-member-directory-heading">
      <header className="et-admin-section-head">
        <h2 id="admin-member-directory-heading">{adminCopy.members.directoryTitle}</h2>
        <p>{adminCopy.members.directoryLead}</p>
      </header>

      <div className="et-admin-toolbar">
        <label className="et-admin-search">
          <span className="et-admin-visually-hidden">Search members</span>
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={adminCopy.members.searchPlaceholder}
          />
        </label>
        <label className="et-admin-filter">
          <span className="et-admin-visually-hidden">Filter members</span>
          <select value={filter} onChange={(event) => onFilterChange(event.target.value as typeof filter)}>
            <option value="all">{adminCopy.members.filterAll}</option>
            <option value="portal">{adminCopy.members.filterPortal}</option>
            <option value="awaiting">{adminCopy.members.filterAwaiting}</option>
            <option value="unverified">{adminCopy.members.filterUnverified}</option>
          </select>
        </label>
      </div>

      {isLoading ? (
        <p className="et-admin-empty">{adminCopy.loading}</p>
      ) : members.length === 0 ? (
        <div className="et-admin-empty-card">
          <p className="et-admin-empty-title">{adminCopy.members.emptyTitle}</p>
          <p>{adminCopy.members.emptyCopy}</p>
        </div>
      ) : (
        <div className="et-admin-member-list">
          {members.map((member) => {
            const operational = describeMemberOperationalState(member);
            const application = findApprovedApplicationForMember(member, approvedApplications);
            const recoverableInvite = memberHasRecoverableInvite(member, application);
            return (
              <article key={member.id} className="et-admin-member-card">
                <header className="et-admin-member-card-head">
                  <div>
                    <h3 className="et-admin-member-card-name">{member.full_name || "—"}</h3>
                    <p className="et-admin-member-card-meta">
                      {member.primary_club || "Club not shared"} · {member.based_in || "Location not shared"}
                    </p>
                  </div>
                  <span
                    className={`et-admin-badge${
                      operational.state === "active"
                        ? " et-admin-badge--forest"
                        : operational.state === "unverified"
                          ? " et-admin-badge--burgundy"
                          : " et-admin-badge--gold"
                    }`}
                  >
                    {operational.label}
                  </span>
                </header>

                <dl className="et-admin-member-card-stats">
                  <div>
                    <dt>Status</dt>
                    <dd>{member.membership_status || "—"}</dd>
                  </div>
                  <div>
                    <dt>FM #</dt>
                    <dd>{member.founding_member_number || "—"}</dd>
                  </div>
                  <div>
                    <dt>Created</dt>
                    <dd>{formatAdminDate(member.created_at)}</dd>
                  </div>
                  <div>
                    <dt>Linked</dt>
                    <dd>{member.user_id ? "Yes" : "No"}</dd>
                  </div>
                </dl>

                <p className="et-admin-member-card-email">{member.email}</p>

                {recoverableInvite && application ? (
                  <div className="et-admin-member-card-actions">
                    {onViewInvitation ? (
                      <button
                        type="button"
                        className="et-btn et-btn--secondary"
                        onClick={() => onViewInvitation(application)}
                      >
                        {adminCopy.members.viewInvitation}
                      </button>
                    ) : null}
                    {onCopyInviteLink ? (
                      <button
                        type="button"
                        className="et-btn et-btn--forest"
                        onClick={() => onCopyInviteLink(application)}
                      >
                        {adminCopy.members.copyInviteLink}
                      </button>
                    ) : null}
                    {onCopyInvitationEmail ? (
                      <button
                        type="button"
                        className="et-btn et-btn--secondary"
                        onClick={() => onCopyInvitationEmail(application)}
                      >
                        {adminCopy.members.copyInvitationEmail}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
