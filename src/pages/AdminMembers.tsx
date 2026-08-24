import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AdminActivityPanel } from "../components/admin/AdminActivityPanel";
import { AdminCoursesLocationPanel } from "../components/admin/AdminCoursesLocationPanel";
import { AdminApplicationsPanel } from "../components/admin/AdminApplicationsPanel";
import { AdminInvitesPanel } from "../components/admin/AdminInvitesPanel";
import { AdminMemberDirectory } from "../components/admin/AdminMemberDirectory";
import { AdminMetricGrid } from "../components/admin/AdminMetricGrid";
import { AdminNav } from "../components/admin/AdminNav";
import { ApplicationViewModal } from "../components/admin/ApplicationViewModal";
import { AiOperationsPanel } from "../components/admin/AiOperationsPanel";
import { InvitationDraftModal } from "../components/admin/InvitationDraftModal";
import { adminCopy, type AdminTabId } from "../data/adminCopy";
import {
  buildOverviewMetrics,
  computeInviteMetrics,
  fetchMemberProfilesForAdmin,
  fetchPortalActiveMemberCount,
  filterAdminMembers,
  logAdminQueryError,
} from "../lib/adminDashboard";
import { getInvitationEmailDraftForApplication } from "../lib/adminMemberInvites";
import { fetchAiAdminDashboard } from "../lib/askEliteTee";
import {
  approveMembershipApplication,
  declineMembershipApplication,
  fetchApprovedApplications,
  fetchPendingApplications,
  fetchPendingApplicationCount,
  regenerateApplicationInviteToken,
} from "../lib/membershipApplications";
import type { ApproveApplicationResult } from "../lib/membershipApplications";
import type { AiAdminDashboard } from "../types/askEliteTee";
import type { MembershipApplicationRecord } from "../types/membershipApplication";
import {
  enrichApplicationsWithReferrers,
  type MembershipApplicationWithReferrer,
} from "../lib/adminApplicationReferrals";
import {
  copyInviteLinkToClipboard,
  getApplicationInviteLink,
} from "../lib/membershipInvites";
import {
  AUTH_USER_ID_LINKING_NOTE,
  createMemberProfile,
  fetchAdminDashboardCounts,
  formatAdminError,
  linkMemberProfileToAuthUser,
  parseListInput,
  type AdminMemberRow,
} from "../lib/memberProfiles";
import { supabase } from "../lib/supabase";
import "../inside-elitetee.css";
import "../member-portal.css";
import "../member-portal-theme.css";
import "../member-portal-admin.css";

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

export function AdminMembers() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTabId>("overview");
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
  const [portalActiveMembers, setPortalActiveMembers] = useState<number | null>(null);
  const [allMembers, setAllMembers] = useState<AdminMemberRow[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberFilter, setMemberFilter] = useState<"all" | "portal" | "awaiting" | "unverified">(
    "all",
  );
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingApplications, setPendingApplications] = useState<
    MembershipApplicationWithReferrer[]
  >([]);
  const [approvedApplications, setApprovedApplications] = useState<
    MembershipApplicationWithReferrer[]
  >([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [viewingApplication, setViewingApplication] =
    useState<MembershipApplicationWithReferrer | null>(null);
  const [invitationDraft, setInvitationDraft] = useState<ApproveApplicationResult | null>(null);
  const [applicationActionId, setApplicationActionId] = useState<string | null>(null);
  const [applicationMessage, setApplicationMessage] = useState<string | null>(null);
  const [applicationError, setApplicationError] = useState<string | null>(null);
  const [pendingLoadWarning, setPendingLoadWarning] = useState<string | null>(null);
  const [approvedLoadWarning, setApprovedLoadWarning] = useState<string | null>(null);
  const [inviteActionId, setInviteActionId] = useState<string | null>(null);
  const [aiDashboard, setAiDashboard] = useState<AiAdminDashboard | null>(null);
  const [aiLoadError, setAiLoadError] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(true);

  const refreshAiDashboard = useCallback(async () => {
    setIsLoadingAi(true);
    const { data, error } = await fetchAiAdminDashboard();
    setIsLoadingAi(false);
    if (error) {
      console.error("[AdminMembers] AI dashboard failed", error);
      setAiLoadError(error.message);
      setAiDashboard(null);
      return;
    }
    setAiLoadError(null);
    setAiDashboard(data);
  }, []);

  const refreshAdminData = useCallback(async () => {
    setIsLoadingDashboard(true);
    setPendingLoadWarning(null);
    setLoadError(null);

    const [counts, members, pending, approved, pendingTotal, portalActive] = await Promise.all([
      fetchAdminDashboardCounts(),
      fetchMemberProfilesForAdmin({ limit: 50 }),
      fetchPendingApplications(),
      fetchApprovedApplications(),
      fetchPendingApplicationCount(),
      fetchPortalActiveMemberCount(),
    ]);

    setDashboardCounts(counts);
    setAllMembers(members.data);
    const [pendingWithReferrers, approvedWithReferrers] = await Promise.all([
      enrichApplicationsWithReferrers(pending.data),
      enrichApplicationsWithReferrers(approved.data),
    ]);
    setPendingApplications(pendingWithReferrers);
    setApprovedApplications(approvedWithReferrers);
    setPendingCount(pendingTotal);
    setPortalActiveMembers(portalActive);

    if (members.error) {
      logAdminQueryError("refreshAdminData.memberProfiles", members.error);
      setLoadError(adminCopy.loadError);
    }

    if (pending.error) {
      logAdminQueryError("refreshAdminData.pendingApplications", pending.error);
      setPendingLoadWarning(
        "Pending applications could not be loaded. Check Supabase permissions or console errors.",
      );
    }

    if (approved.error) {
      logAdminQueryError("refreshAdminData.approvedApplications", approved.error);
      setApprovedLoadWarning(
        "Approved applications could not be loaded. Check Supabase permissions or console errors.",
      );
    }

    setIsLoadingDashboard(false);
    void refreshAiDashboard();
  }, [refreshAiDashboard]);

  useEffect(() => {
    void refreshAdminData();
  }, [refreshAdminData]);

  const inviteMetrics = useMemo(
    () => computeInviteMetrics(approvedApplications),
    [approvedApplications],
  );

  const overviewMetrics = useMemo(
    () =>
      buildOverviewMetrics({
        pendingApplications: pendingCount,
        approvedMembers: dashboardCounts.approvedMembers,
        profilesCreated: dashboardCounts.profilesCreated,
        portalActiveMembers,
        inviteMetrics,
        aiDashboard,
      }),
    [pendingCount, dashboardCounts, portalActiveMembers, inviteMetrics, aiDashboard],
  );

  const filteredMembers = useMemo(
    () => filterAdminMembers(allMembers, { search: memberSearch, filter: memberFilter }),
    [allMembers, memberSearch, memberFilter],
  );

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

  async function handleCopyInviteLink(application: MembershipApplicationRecord) {
    const inviteLink = getApplicationInviteLink(application);
    if (!inviteLink) {
      setApplicationError("Invite link missing for this approved application.");
      return;
    }

    const { error } = await copyInviteLinkToClipboard(inviteLink);
    if (error) {
      setApplicationError(error.message);
      return;
    }

    setApplicationMessage(`Invite link copied for ${application.full_name}.`);
    setApplicationError(null);
  }

  function handleViewInvitation(application: MembershipApplicationRecord) {
    const invitationLink = getApplicationInviteLink(application);
    const invitationEmailDraft = getInvitationEmailDraftForApplication(application);

    if (!invitationLink || !invitationEmailDraft) {
      setApplicationError("Invitation materials are unavailable for this member.");
      return;
    }

    setInvitationDraft({
      application,
      invitationEmailDraft,
      foundingMemberNumber: application.founding_member_number ?? "Founding Member",
      memberProfileId: application.member_profile_id,
      invitationLink,
      inviteToken: application.invite_token ?? "",
    });
    setViewingApplication(null);
    setApplicationError(null);
  }

  async function handleCopyInvitationEmail(application: MembershipApplicationRecord) {
    const invitationEmailDraft = getInvitationEmailDraftForApplication(application);
    if (!invitationEmailDraft) {
      setApplicationError("Invitation email draft unavailable for this member.");
      return;
    }

    const { error } = await copyInviteLinkToClipboard(invitationEmailDraft);
    if (error) {
      setApplicationError(error.message);
      return;
    }

    setApplicationMessage(`Invitation email copied for ${application.full_name}.`);
    setApplicationError(null);
  }

  async function handleRegenerateInviteLink(applicationId: string) {
    setInviteActionId(applicationId);
    setApplicationMessage(null);
    setApplicationError(null);

    const { data, error } = await regenerateApplicationInviteToken(applicationId);

    setInviteActionId(null);

    if (error) {
      setApplicationError(formatAdminError(error));
      return;
    }

    if (data) {
      setApplicationMessage(`Invite link regenerated for ${data.application.full_name}.`);
      const [enriched] = await enrichApplicationsWithReferrers([data.application]);
      setViewingApplication(enriched ?? null);
    }

    void refreshAdminData();
  }

  async function handleDeclineApplication(applicationId: string) {
    if (!window.confirm(adminCopy.applications.declineConfirm)) return;

    const reason = window.prompt(adminCopy.applications.declinePrompt);
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
    <div className="inside-page portal-page portal-page--social et-theme-portal" data-et-theme="portal">
      <header className="portal-top portal-chrome">
        <Link to="/member-portal" className="portal-logo-link" aria-label="EliteTee member portal">
          <span className="inside-logo-mark portal-logo-mark" aria-hidden="true" />
        </Link>
        <button
          type="button"
          className="portal-btn portal-btn--gold portal-signout et-admin-signout"
          onClick={handleSignOut}
          disabled={isSigningOut}
        >
          {isSigningOut ? adminCopy.signingOut : adminCopy.signOut}
        </button>
      </header>

      <main className="portal-main et-admin">
        <header className="et-admin-header">
          <div className="et-admin-header-copy">
            <p className="et-admin-eyebrow">{adminCopy.eyebrow}</p>
            <h1 className="et-admin-title">{adminCopy.title}</h1>
            <p className="et-admin-lead">{adminCopy.lead}</p>
          </div>
        </header>

        <AdminNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          pendingCount={pendingCount}
        />

        {loadError ? (
          <div className="et-admin-alert et-admin-alert--error" role="alert">
            <p>{loadError}</p>
            <button type="button" className="et-btn et-btn--secondary" onClick={() => void refreshAdminData()}>
              {adminCopy.actions.retry}
            </button>
          </div>
        ) : null}

        {(activeTab === "applications" || activeTab === "invites" || activeTab === "members") &&
        applicationMessage ? (
          <p className="et-admin-alert et-admin-alert--success" role="status">
            {applicationMessage}
          </p>
        ) : null}

        {(activeTab === "applications" || activeTab === "invites" || activeTab === "members") &&
        applicationError ? (
          <p className="et-admin-alert et-admin-alert--error" role="alert">
            {applicationError}
          </p>
        ) : null}

        {activeTab === "overview" ? (
          <AdminMetricGrid metrics={overviewMetrics} isLoading={isLoadingDashboard || isLoadingAi} />
        ) : null}

        {activeTab === "applications" ? (
          <AdminApplicationsPanel
            pendingApplications={pendingApplications}
            approvedApplications={approvedApplications}
            isLoading={isLoadingDashboard}
            pendingLoadWarning={pendingLoadWarning}
            approvedLoadWarning={approvedLoadWarning}
            applicationMessage={applicationMessage}
            applicationError={applicationError}
            applicationActionId={applicationActionId}
            inviteActionId={inviteActionId}
            onApprove={(applicationId) => void handleApproveApplication(applicationId)}
            onDecline={(applicationId) => void handleDeclineApplication(applicationId)}
            onView={setViewingApplication}
            onCopyInvite={(application) => void handleCopyInviteLink(application)}
            onCopyInvitationEmail={(application) => void handleCopyInvitationEmail(application)}
            onViewInvitation={handleViewInvitation}
            onRegenerateInvite={(applicationId) => void handleRegenerateInviteLink(applicationId)}
          />
        ) : null}

        {activeTab === "invites" ? (
          <AdminInvitesPanel
            approvedApplications={approvedApplications}
            isLoading={isLoadingDashboard}
            inviteActionId={inviteActionId}
            onView={setViewingApplication}
            onCopyInvite={(application) => void handleCopyInviteLink(application)}
            onCopyInvitationEmail={(application) => void handleCopyInvitationEmail(application)}
            onViewInvitation={handleViewInvitation}
            onRegenerateInvite={(applicationId) => void handleRegenerateInviteLink(applicationId)}
          />
        ) : null}

        {activeTab === "members" ? (
          <div className="et-admin-stack">
            <AdminMemberDirectory
              members={filteredMembers}
              approvedApplications={approvedApplications}
              isLoading={isLoadingDashboard}
              search={memberSearch}
              filter={memberFilter}
              onSearchChange={setMemberSearch}
              onFilterChange={setMemberFilter}
              onCopyInviteLink={(application) => void handleCopyInviteLink(application)}
              onCopyInvitationEmail={(application) => void handleCopyInvitationEmail(application)}
              onViewInvitation={handleViewInvitation}
            />

            <section className="et-admin-section" aria-labelledby="create-member-heading">
              <header className="et-admin-section-head">
                <h2 id="create-member-heading">{adminCopy.members.createTitle}</h2>
                <p>{adminCopy.members.createLead}</p>
              </header>

              {successMessage ? (
                <p className="et-admin-alert et-admin-alert--success" role="status">
                  {successMessage}
                </p>
              ) : null}
              {errorMessage ? (
                <p className="et-admin-alert et-admin-alert--error" role="alert">
                  {errorMessage}
                </p>
              ) : null}

              <form className="et-admin-stack" onSubmit={handleSubmit}>
                <div className="et-admin-form-card">
                  <h3>Account</h3>
                  <div className="et-admin-form-grid">
                    <label className="et-admin-field et-admin-field--full">
                      <span>Supabase Auth User UID</span>
                      <input
                        type="text"
                        value={form.auth_user_id}
                        onChange={(event) => updateField("auth_user_id", event.target.value)}
                        placeholder="Paste UID from Supabase Authentication > Users"
                        required
                      />
                    </label>
                    <label className="et-admin-field et-admin-field--full">
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

                <div className="et-admin-form-card">
                  <h3>Member identity</h3>
                  <div className="et-admin-form-grid">
                    <label className="et-admin-field">
                      <span>Full name</span>
                      <input
                        type="text"
                        value={form.full_name}
                        onChange={(event) => updateField("full_name", event.target.value)}
                        required
                      />
                    </label>
                    <label className="et-admin-field">
                      <span>Primary club</span>
                      <input
                        type="text"
                        value={form.primary_club}
                        onChange={(event) => updateField("primary_club", event.target.value)}
                        required
                      />
                    </label>
                    <label className="et-admin-field">
                      <span>Based in</span>
                      <input
                        type="text"
                        value={form.based_in}
                        onChange={(event) => updateField("based_in", event.target.value)}
                        required
                      />
                    </label>
                    <label className="et-admin-field">
                      <span>Industry</span>
                      <input
                        type="text"
                        value={form.industry}
                        onChange={(event) => updateField("industry", event.target.value)}
                        required
                      />
                    </label>
                    <label className="et-admin-field">
                      <span>Membership status</span>
                      <select
                        value={form.membership_status}
                        onChange={(event) => updateField("membership_status", event.target.value)}
                        required
                      >
                        <option value="Founding Member">Founding Member</option>
                        <option value="Verified Member">Verified Member</option>
                      </select>
                    </label>
                    <label className="et-admin-field et-admin-field--checkbox">
                      <input
                        type="checkbox"
                        checked={form.is_verified}
                        onChange={(event) => updateField("is_verified", event.target.checked)}
                      />
                      <span>Verified member</span>
                    </label>
                  </div>
                </div>

                <div className="et-admin-form-card">
                  <h3>Golf profile</h3>
                  <div className="et-admin-form-grid">
                    <label className="et-admin-field et-admin-field--full">
                      <span>Additional clubs</span>
                      <textarea
                        rows={3}
                        value={form.additional_clubs}
                        onChange={(event) => updateField("additional_clubs", event.target.value)}
                        placeholder="One club per line"
                      />
                    </label>
                    <label className="et-admin-field et-admin-field--full">
                      <span>Regions</span>
                      <textarea
                        rows={3}
                        value={form.regions}
                        onChange={(event) => updateField("regions", event.target.value)}
                        placeholder="One region per line"
                        required
                      />
                    </label>
                    <label className="et-admin-field et-admin-field--full">
                      <span>Traveling to</span>
                      <input
                        type="text"
                        value={form.traveling_to}
                        onChange={(event) => updateField("traveling_to", event.target.value)}
                        placeholder="Upcoming travel destination, if any"
                      />
                    </label>
                  </div>
                </div>

                <div className="et-admin-form-card">
                  <h3>Interests &amp; requests</h3>
                  <div className="et-admin-form-grid">
                    <label className="et-admin-field et-admin-field--full">
                      <span>Golf interests</span>
                      <textarea
                        rows={3}
                        value={form.golf_interests}
                        onChange={(event) => updateField("golf_interests", event.target.value)}
                        placeholder="One interest per line"
                      />
                    </label>
                    <label className="et-admin-field et-admin-field--full">
                      <span>Business interests</span>
                      <textarea
                        rows={3}
                        value={form.business_interests}
                        onChange={(event) => updateField("business_interests", event.target.value)}
                        placeholder="One interest per line"
                      />
                    </label>
                    <label className="et-admin-field et-admin-field--full">
                      <span>Current request</span>
                      <textarea
                        rows={3}
                        value={form.current_request}
                        onChange={(event) => updateField("current_request", event.target.value)}
                        placeholder="What the member is currently seeking"
                      />
                    </label>
                  </div>
                </div>

                <button type="submit" className="et-btn et-btn--forest" disabled={isSubmitting}>
                  {isSubmitting ? adminCopy.actions.saving : adminCopy.actions.createProfile}
                </button>
              </form>
            </section>

            <section className="et-admin-section" aria-labelledby="link-member-heading">
              <header className="et-admin-section-head">
                <h2 id="link-member-heading">{adminCopy.members.linkTitle}</h2>
                <p>{adminCopy.members.linkLead}</p>
              </header>

              {linkMessage ? (
                <p className="et-admin-alert et-admin-alert--success" role="status">
                  {linkMessage}
                </p>
              ) : null}
              {linkError ? (
                <p className="et-admin-alert et-admin-alert--error" role="alert">
                  {linkError}
                </p>
              ) : null}

              <form className="et-admin-stack" onSubmit={handleLinkSubmit}>
                <div className="et-admin-form-card">
                  <div className="et-admin-form-grid">
                    <label className="et-admin-field">
                      <span>Member email</span>
                      <input
                        type="email"
                        value={linkEmail}
                        onChange={(event) => setLinkEmail(event.target.value)}
                        placeholder="member@email.com"
                        required
                      />
                    </label>
                    <label className="et-admin-field">
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
                <button type="submit" className="et-btn et-btn--secondary" disabled={isLinking}>
                  {isLinking ? adminCopy.actions.linking : adminCopy.actions.linkMember}
                </button>
              </form>
            </section>

            <section className="et-admin-section" aria-labelledby="admin-notes-heading">
              <header className="et-admin-section-head">
                <h2 id="admin-notes-heading">{adminCopy.members.notesTitle}</h2>
                <p>{adminCopy.members.notesLead}</p>
              </header>
              <div className="et-admin-notes-card">
                <p>{AUTH_USER_ID_LINKING_NOTE}</p>
                <ul className="et-admin-notes-list">
                  <li>
                    Applications submit to Supabase and appear in Applications for review.
                  </li>
                  <li>
                    Approving creates a Founding Member profile, generates a private invite link,
                    and prepares an invitation email draft (not sent automatically).
                  </li>
                  <li>
                    The applicant uses the private invite link to create their login. Portal access
                    is enabled only after they complete invite signup.
                  </li>
                  <li>
                    Create a profile manually when needed. Link Existing Member Login when a profile
                    exists but portal access fails due to a UID mismatch.
                  </li>
                  <li>
                    <code>auth.uid()</code> must equal <code>public.users.id</code> and{" "}
                    <code>member_profiles.user_id</code>.
                  </li>
                </ul>
              </div>
            </section>
          </div>
        ) : null}

        {activeTab === "ai" ? (
          <AiOperationsPanel
            dashboard={aiDashboard}
            isLoading={isLoadingAi}
            errorMessage={aiLoadError}
            onRefresh={() => void refreshAiDashboard()}
          />
        ) : null}

        {activeTab === "activity" ? (
          <>
            <AdminActivityPanel
              recentMembers={allMembers}
              approvedApplications={approvedApplications}
              isLoading={isLoadingDashboard}
            />
            <AdminCoursesLocationPanel isLoading={isLoadingDashboard} />
          </>
        ) : null}
      </main>

      {viewingApplication ? (
        <ApplicationViewModal
          application={viewingApplication}
          onClose={() => setViewingApplication(null)}
          onRegenerateInvite={
            viewingApplication.status === "approved" && !viewingApplication.invite_redeemed_at
              ? (applicationId) => void handleRegenerateInviteLink(applicationId)
              : undefined
          }
          onViewInvitation={handleViewInvitation}
          isRegeneratingInvite={inviteActionId === viewingApplication.id}
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
