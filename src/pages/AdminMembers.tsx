import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApplicationViewModal } from "../components/admin/ApplicationViewModal";
import { InvitationDraftModal } from "../components/admin/InvitationDraftModal";
import {
  approveMembershipApplication,
  declineMembershipApplication,
  fetchPendingApplications,
  fetchPendingApplicationCount,
} from "../lib/membershipApplications";
import type { ApproveApplicationResult } from "../lib/membershipApplications";
import type { MembershipApplicationRecord } from "../types/membershipApplication";
import {
  createMemberProfile,
  fetchAdminDashboardCounts,
  fetchRecentMemberProfilesForAdmin,
  formatAdminError,
  linkMemberProfileToAuthUser,
  parseListInput,
  AUTH_USER_ID_LINKING_NOTE,
  type AdminMemberRow,
} from "../lib/memberProfiles";
import { supabase } from "../lib/supabase";
import "../inside-elitetee.css";
import "../member-portal.css";

type FormState = {
  auth_user_id: string;
  full_name: string;
  email: string;
  primary_club: string;
  additional_clubs: string;
  based_in: string;
  regions: string;
  industry: string;
  golf_interests: string;
  business_interests: string;
  current_request: string;
  traveling_to: string;
  membership_status: string;
  is_verified: boolean;
};

const initialFormState: FormState = {
  auth_user_id: "",
  full_name: "",
  email: "",
  primary_club: "",
  additional_clubs: "",
  based_in: "",
  regions: "",
  industry: "",
  golf_interests: "",
  business_interests: "",
  current_request: "",
  traveling_to: "",
  membership_status: "Verified Member",
  is_verified: true,
};

function formatAdminDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function AdminMembers() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [linkEmail, setLinkEmail] = useState("");
  const [linkAuthUserId, setLinkAuthUserId] = useState("");
  const [isLinking, setIsLinking] = useState(false);
  const [linkMessage, setLinkMessage] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [dashboardCounts, setDashboardCounts] = useState({
    profilesCreated: 0,
    approvedMembers: 0,
  });
  const [recentMembers, setRecentMembers] = useState<AdminMemberRow[]>([]);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [pendingApplications, setPendingApplications] = useState<MembershipApplicationRecord[]>(
    [],
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [viewingApplication, setViewingApplication] = useState<MembershipApplicationRecord | null>(
    null,
  );
  const [invitationDraft, setInvitationDraft] = useState<ApproveApplicationResult | null>(null);
  const [applicationActionId, setApplicationActionId] = useState<string | null>(null);
  const [applicationMessage, setApplicationMessage] = useState<string | null>(null);
  const [applicationError, setApplicationError] = useState<string | null>(null);
  const [pendingLoadWarning, setPendingLoadWarning] = useState<string | null>(null);

  const refreshAdminData = useCallback(async () => {
    setIsLoadingDashboard(true);
    setPendingLoadWarning(null);

    const [counts, recent, pending, pendingTotal] = await Promise.all([
      fetchAdminDashboardCounts(),
      fetchRecentMemberProfilesForAdmin(10),
      fetchPendingApplications(),
      fetchPendingApplicationCount(),
    ]);

    setDashboardCounts(counts);
    setRecentMembers(recent.data);
    setPendingApplications(pending.data);
    setPendingCount(pendingTotal);

    if (pending.error) {
      console.error("[AdminMembers] failed to fetch pending applications", pending.error);
      setPendingLoadWarning(
        "Pending applications could not be loaded. Check Supabase permissions or console errors.",
      );
    }

    setIsLoadingDashboard(false);
  }, []);

  useEffect(() => {
    void refreshAdminData();
  }, [refreshAdminData]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setSuccessMessage(null);
    setErrorMessage(null);
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    if (supabase) {
      await supabase.auth.signOut();
    }
    navigate("/login", { replace: true });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const { data, error, travelingToSkipped } = await createMemberProfile({
      user_id: form.auth_user_id.trim(),
      full_name: form.full_name.trim(),
      email: form.email.trim().toLowerCase(),
      primary_club: form.primary_club.trim(),
      additional_clubs: parseListInput(form.additional_clubs),
      based_in: form.based_in.trim(),
      regions: parseListInput(form.regions),
      industry: form.industry.trim(),
      golf_interests: parseListInput(form.golf_interests),
      business_interests: parseListInput(form.business_interests),
      current_request: form.current_request.trim(),
      traveling_to: form.traveling_to.trim(),
      membership_status: form.membership_status.trim(),
      is_verified: form.is_verified,
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(formatAdminError(error));
      return;
    }

    const travelingNote = travelingToSkipped
      ? " Note: traveling_to column is not in the database yet — profile saved without it."
      : "";

    setSuccessMessage(
      `Member profile created successfully.${data?.id ? ` ID: ${data.id}` : ""}${travelingNote}`,
    );
    setForm(initialFormState);
    void refreshAdminData();
  }

  async function handleLinkSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLinking(true);
    setLinkMessage(null);
    setLinkError(null);

    const { data, error } = await linkMemberProfileToAuthUser({
      email: linkEmail,
      authUserId: linkAuthUserId,
    });

    setIsLinking(false);

    if (error) {
      setLinkError(formatAdminError(error));
      return;
    }

    setLinkMessage(
      `Linked ${data?.full_name ?? "member profile"} to Auth UID ${linkAuthUserId.trim()}.`,
    );
    setLinkEmail("");
    setLinkAuthUserId("");
    void refreshAdminData();
  }

  async function handleApproveApplication(applicationId: string) {
    setApplicationActionId(applicationId);
    setApplicationMessage(null);
    setApplicationError(null);

    const { data, error } = await approveMembershipApplication(applicationId);

    setApplicationActionId(null);

    if (error) {
      setApplicationError(formatAdminError(error));
      return;
    }

    if (data) {
      setInvitationDraft(data);
      setApplicationMessage(
        `${data.foundingMemberNumber} approved. Member profile created — review the invitation before sending.`,
      );
    }

    void refreshAdminData();
  }

  async function handleDeclineApplication(applicationId: string) {
    const reason = window.prompt("Optional decline note for your records:");
    if (reason === null) return;

    setApplicationActionId(applicationId);
    setApplicationMessage(null);
    setApplicationError(null);

    const { error } = await declineMembershipApplication(applicationId, reason);

    setApplicationActionId(null);

    if (error) {
      setApplicationError(formatAdminError(error));
      return;
    }

    setApplicationMessage("Application declined.");
    void refreshAdminData();
  }

  return (
    <div className="inside-page portal-page">
      <header className="portal-top">
        <Link to="/member-portal" className="portal-logo-link" aria-label="EliteTee member portal">
          <span className="inside-logo-mark portal-logo-mark" aria-hidden="true" />
        </Link>
        <button
          type="button"
          className="portal-btn portal-btn--gold portal-signout"
          onClick={handleSignOut}
          disabled={isSigningOut}
        >
          {isSigningOut ? "Signing out..." : "Sign Out"}
        </button>
      </header>

      <main className="portal-main portal-admin-main">
        <header className="portal-section-head portal-admin-head">
          <h1>EliteTee Admin</h1>
          <p>
            Internal dashboard for onboarding approved members, linking logins, and keeping member
            records accurate.
          </p>
        </header>

        <section className="admin-dashboard" aria-label="Admin overview">
          <article className="admin-stat-card">
            <p className="admin-stat-label">Pending Applications</p>
            <p className="admin-stat-value">
              {isLoadingDashboard ? "…" : pendingCount}
            </p>
            <p className="admin-stat-note">Awaiting review in EliteTee Admin</p>
          </article>
          <article className="admin-stat-card">
            <p className="admin-stat-label">Approved Members</p>
            <p className="admin-stat-value">
              {isLoadingDashboard ? "…" : dashboardCounts.approvedMembers}
            </p>
            <p className="admin-stat-note">Founding, verified, approved, or active status</p>
          </article>
          <article className="admin-stat-card">
            <p className="admin-stat-label">Member Profiles Created</p>
            <p className="admin-stat-value">
              {isLoadingDashboard ? "…" : dashboardCounts.profilesCreated}
            </p>
            <p className="admin-stat-note">Profiles in member_profiles</p>
          </article>
        </section>

        <section className="admin-section" aria-labelledby="pending-applications-heading">
          <header className="admin-section-head">
            <h2 id="pending-applications-heading">Pending Applications</h2>
            <p>
              Review membership requests submitted through the website. Approve to create a Founding
              Member profile and generate an invitation.
            </p>
          </header>

          {applicationMessage ? (
            <p className="portal-alert portal-alert--success" role="status">
              {applicationMessage}
            </p>
          ) : null}

          {applicationError ? (
            <p className="portal-alert portal-alert--error" role="alert">
              {applicationError}
            </p>
          ) : null}

          {pendingLoadWarning ? (
            <p className="portal-alert portal-alert--warning" role="alert">
              {pendingLoadWarning}
            </p>
          ) : null}

          {isLoadingDashboard ? (
            <p className="admin-empty-state">Loading applications…</p>
          ) : pendingApplications.length === 0 ? (
            <div className="admin-empty-state">
              <p>No applications waiting for review.</p>
              <p className="admin-empty-state-note">
                New requests from the homepage application form will appear here.
              </p>
            </div>
          ) : (
            <div className="admin-members-table-wrap">
              <table className="admin-members-table admin-applications-table">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Email</th>
                    <th scope="col">Date Applied</th>
                    <th scope="col">Status</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingApplications.map((application) => (
                    <tr key={application.id}>
                      <td data-label="Name">{application.full_name}</td>
                      <td data-label="Email">{application.email}</td>
                      <td data-label="Date Applied">{formatAdminDate(application.applied_at)}</td>
                      <td data-label="Status">
                        <span className="admin-badge admin-badge--pending">Pending Review</span>
                      </td>
                      <td data-label="Actions">
                        <div className="admin-application-actions">
                          <button
                            type="button"
                            className="portal-btn portal-btn--gold portal-btn--compact"
                            disabled={applicationActionId === application.id}
                            onClick={() => void handleApproveApplication(application.id)}
                          >
                            {applicationActionId === application.id ? "Approving…" : "Approve"}
                          </button>
                          <button
                            type="button"
                            className="portal-btn portal-btn--outline portal-btn--compact"
                            disabled={applicationActionId === application.id}
                            onClick={() => void handleDeclineApplication(application.id)}
                          >
                            Decline
                          </button>
                          <button
                            type="button"
                            className="portal-btn portal-btn--outline portal-btn--compact"
                            onClick={() => setViewingApplication(application)}
                          >
                            View Application
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="admin-section" aria-labelledby="recent-members-heading">
          <header className="admin-section-head">
            <h2 id="recent-members-heading">Recent Member Profiles</h2>
            <p>Latest profiles created in Supabase, most recent first.</p>
          </header>

          {isLoadingDashboard ? (
            <p className="admin-empty-state">Loading member profiles…</p>
          ) : recentMembers.length === 0 ? (
            <div className="admin-empty-state">
              <p>No member profiles yet.</p>
              <p className="admin-empty-state-note">
                Create the first approved member profile below to get started.
              </p>
            </div>
          ) : (
            <div className="admin-members-table-wrap">
              <table className="admin-members-table">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Email</th>
                    <th scope="col">Primary Club</th>
                    <th scope="col">Based In</th>
                    <th scope="col">Status</th>
                    <th scope="col">FM #</th>
                    <th scope="col">Portal</th>
                    <th scope="col">Verified</th>
                    <th scope="col">Created</th>
                    <th scope="col">Linked</th>
                  </tr>
                </thead>
                <tbody>
                  {recentMembers.map((member) => (
                    <tr key={member.id}>
                      <td data-label="Name">{member.full_name || "—"}</td>
                      <td data-label="Email">{member.email || "—"}</td>
                      <td data-label="Primary Club">{member.primary_club || "—"}</td>
                      <td data-label="Based In">{member.based_in || "—"}</td>
                      <td data-label="Status">{member.membership_status || "—"}</td>
                      <td data-label="FM #">{member.founding_member_number || "—"}</td>
                      <td data-label="Portal">
                        {member.portal_access_enabled ? (
                          <span className="admin-badge admin-badge--linked">Enabled</span>
                        ) : (
                          <span className="admin-badge admin-badge--muted">No</span>
                        )}
                      </td>
                      <td data-label="Verified">
                        {member.is_verified ? (
                          <span className="admin-badge admin-badge--verified">Verified</span>
                        ) : (
                          <span className="admin-badge admin-badge--muted">No</span>
                        )}
                      </td>
                      <td data-label="Created">{formatAdminDate(member.created_at)}</td>
                      <td data-label="Linked">
                        {member.user_id ? (
                          <span className="admin-badge admin-badge--linked">Yes</span>
                        ) : (
                          <span className="admin-badge admin-badge--unlinked">No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="admin-section" aria-labelledby="create-member-heading">
          <header className="admin-section-head">
            <h2 id="create-member-heading">Create Approved Member Profile</h2>
            <p>
              Use this when an applicant has been approved and you need to create their member
              profile before they can use the portal. Requires the member&apos;s Supabase Auth UID.
            </p>
          </header>

          {successMessage ? (
            <p className="portal-alert portal-alert--success" role="status">
              {successMessage}
            </p>
          ) : null}

          {errorMessage ? (
            <p className="portal-alert portal-alert--error" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <form className="portal-admin-form" onSubmit={handleSubmit}>
            <div className="admin-form-card">
              <h3 className="admin-form-group-title">Account</h3>
              <div className="portal-admin-form-grid">
                <label className="portal-profile-field portal-profile-field--full">
                  <span>Supabase Auth User UID</span>
                  <input
                    type="text"
                    value={form.auth_user_id}
                    onChange={(event) => updateField("auth_user_id", event.target.value)}
                    placeholder="Paste UID from Supabase Authentication > Users"
                    required
                  />
                </label>

                <label className="portal-profile-field portal-profile-field--full">
                  <span>Email</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    required
                  />
                </label>
              </div>
            </div>

            <div className="admin-form-card">
              <h3 className="admin-form-group-title">Member Identity</h3>
              <div className="portal-admin-form-grid">
                <label className="portal-profile-field">
                  <span>Full Name</span>
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={(event) => updateField("full_name", event.target.value)}
                    required
                  />
                </label>

                <label className="portal-profile-field">
                  <span>Primary Club</span>
                  <input
                    type="text"
                    value={form.primary_club}
                    onChange={(event) => updateField("primary_club", event.target.value)}
                    required
                  />
                </label>

                <label className="portal-profile-field">
                  <span>Based In</span>
                  <input
                    type="text"
                    value={form.based_in}
                    onChange={(event) => updateField("based_in", event.target.value)}
                    required
                  />
                </label>

                <label className="portal-profile-field">
                  <span>Industry</span>
                  <input
                    type="text"
                    value={form.industry}
                    onChange={(event) => updateField("industry", event.target.value)}
                    required
                  />
                </label>

                <label className="portal-profile-field">
                  <span>Membership Status</span>
                  <select
                    value={form.membership_status}
                    onChange={(event) => updateField("membership_status", event.target.value)}
                    required
                  >
                    <option value="Founding Member">Founding Member</option>
                    <option value="Verified Member">Verified Member</option>
                  </select>
                </label>

                <label className="portal-profile-field portal-profile-field--checkbox">
                  <input
                    type="checkbox"
                    checked={form.is_verified}
                    onChange={(event) => updateField("is_verified", event.target.checked)}
                  />
                  <span>Verified Member</span>
                </label>
              </div>
            </div>

            <div className="admin-form-card">
              <h3 className="admin-form-group-title">Golf Profile</h3>
              <div className="portal-admin-form-grid">
                <label className="portal-profile-field portal-profile-field--full">
                  <span>Additional Clubs</span>
                  <textarea
                    rows={3}
                    value={form.additional_clubs}
                    onChange={(event) => updateField("additional_clubs", event.target.value)}
                    placeholder="One club per line"
                  />
                </label>

                <label className="portal-profile-field portal-profile-field--full">
                  <span>Regions</span>
                  <textarea
                    rows={3}
                    value={form.regions}
                    onChange={(event) => updateField("regions", event.target.value)}
                    placeholder="One region per line"
                    required
                  />
                </label>

                <label className="portal-profile-field portal-profile-field--full">
                  <span>Traveling To</span>
                  <input
                    type="text"
                    value={form.traveling_to}
                    onChange={(event) => updateField("traveling_to", event.target.value)}
                    placeholder="Upcoming travel destination, if any"
                  />
                </label>
              </div>
            </div>

            <div className="admin-form-card">
              <h3 className="admin-form-group-title">Interests &amp; Requests</h3>
              <div className="portal-admin-form-grid">
                <label className="portal-profile-field portal-profile-field--full">
                  <span>Golf Interests</span>
                  <textarea
                    rows={3}
                    value={form.golf_interests}
                    onChange={(event) => updateField("golf_interests", event.target.value)}
                    placeholder="One interest per line"
                  />
                </label>

                <label className="portal-profile-field portal-profile-field--full">
                  <span>Business Interests</span>
                  <textarea
                    rows={3}
                    value={form.business_interests}
                    onChange={(event) => updateField("business_interests", event.target.value)}
                    placeholder="One interest per line"
                  />
                </label>

                <label className="portal-profile-field portal-profile-field--full">
                  <span>Current Request</span>
                  <textarea
                    rows={3}
                    value={form.current_request}
                    onChange={(event) => updateField("current_request", event.target.value)}
                    placeholder="What the member is currently seeking"
                  />
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="portal-btn portal-btn--gold portal-admin-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Create Member Profile"}
            </button>
          </form>
        </section>

        <section className="admin-section" aria-labelledby="link-member-heading">
          <header className="admin-section-head">
            <h2 id="link-member-heading">Link Existing Member Login</h2>
            <p>
              Use this when a member profile already exists but their Supabase Auth UID is missing
              or incorrect. This connects their login to the correct member_profiles record.
            </p>
          </header>

          {linkMessage ? (
            <p className="portal-alert portal-alert--success" role="status">
              {linkMessage}
            </p>
          ) : null}

          {linkError ? (
            <p className="portal-alert portal-alert--error" role="alert">
              {linkError}
            </p>
          ) : null}

          <form className="portal-admin-form" onSubmit={handleLinkSubmit}>
            <div className="admin-form-card">
              <div className="portal-admin-form-grid">
                <label className="portal-profile-field">
                  <span>Member Email</span>
                  <input
                    type="email"
                    value={linkEmail}
                    onChange={(event) => setLinkEmail(event.target.value)}
                    placeholder="member@email.com"
                    required
                  />
                </label>

                <label className="portal-profile-field">
                  <span>Supabase Auth User UID</span>
                  <input
                    type="text"
                    value={linkAuthUserId}
                    onChange={(event) => setLinkAuthUserId(event.target.value)}
                    placeholder="Paste UID from Authentication > Users"
                    required
                  />
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="portal-btn portal-btn--outline portal-admin-submit"
              disabled={isLinking}
            >
              {isLinking ? "Linking..." : "Link Member To Auth UID"}
            </button>
          </form>
        </section>

        <section className="admin-section admin-section--notes" aria-labelledby="admin-notes-heading">
          <header className="admin-section-head">
            <h2 id="admin-notes-heading">Admin Notes</h2>
            <p>Reference guidance for onboarding and account linking.</p>
          </header>
          <div className="admin-notes-card">
            <p>{AUTH_USER_ID_LINKING_NOTE}</p>
            <ul>
              <li>
                Applications submit to Supabase and appear in Pending Applications above for review.
              </li>
              <li>
                Approving creates a Founding Member profile (FM-001, FM-002, …), generates a
                private invite link, and prepares an invitation email draft (not sent automatically).
              </li>
              <li>
                The applicant uses the private invite link to create their login. Portal access is
                enabled only after they complete invite signup.
              </li>
              <li>
                Create a profile manually below when needed. Link Existing Member Login when a
                profile exists but portal access fails due to a UID mismatch.
              </li>
              <li>
                <code>auth.uid()</code> must equal <code>public.users.id</code> and{" "}
                <code>member_profiles.user_id</code>.
              </li>
            </ul>
          </div>
        </section>
      </main>

      {viewingApplication ? (
        <ApplicationViewModal
          application={viewingApplication}
          onClose={() => setViewingApplication(null)}
        />
      ) : null}

      {invitationDraft ? (
        <InvitationDraftModal
          foundingMemberNumber={invitationDraft.foundingMemberNumber}
          invitationEmailDraft={invitationDraft.invitationEmailDraft}
          invitationLink={invitationDraft.invitationLink}
          onClose={() => setInvitationDraft(null)}
        />
      ) : null}
    </div>
  );
}
