import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IntroductionRequestForm } from "../components/member-portal/IntroductionRequestForm";
import { MemberCard } from "../components/member-portal/MemberCard";
import { MemberProfileModalContent } from "../components/member-portal/MemberProfileModalContent";
import { PortalHome } from "../components/member-portal/PortalHome";
import { ProfileDossier } from "../components/member-portal/ProfileDossier";
import { PrivateMessageModal } from "../components/member-portal/PrivateMessageModal";
import { RequestsBoard } from "../components/member-portal/RequestsBoard";
import { privacyCopy } from "../data/memberPortalDirectory";
import {
  createIntroductionRequest,
  fetchIntroductionRequests,
  updateIntroductionRequestStatus,
} from "../lib/introductionRequests";
import { fetchMemberProfiles, coerceProfileStringList, normalizeMemberProfileRecord } from "../lib/memberProfiles";
import { fetchUnreadMessageCount } from "../lib/privateMessages";
import {
  buildRequestsNotificationLabel,
  countUnseenPendingIntroductionRequests,
  formatNotificationCount,
  getPendingReceivedIntroductionRequestIds,
  getSeenIntroductionRequestIds,
  markIntroductionRequestsSeen,
} from "../lib/portalNotifications";
import { getCurrentAuthUserId } from "../lib/authUserLinking";
import { supabase } from "../lib/supabase";
import type { IntroductionRequestRecord, IntroductionRequestType } from "../types/introductionRequest";
import type { MemberProfileRecord } from "../types/memberProfileRecord";
import "../inside-elitetee.css";
import "../member-portal.css";

const INITIAL_LOADER_MS = 1800;
const TAB_TRANSITION_MS = 650;

type PortalTab = "home" | "members" | "requests" | "network" | "profile";

type PortalModal =
  | { type: "intro-request"; member: MemberProfileRecord }
  | { type: "intro-success"; memberName: string }
  | { type: "profile"; member: MemberProfileRecord };

const portalTabs: { id: PortalTab; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "members", label: "Verified Network" },
  { id: "requests", label: "Member Introductions" },
  { id: "network", label: "Connections" },
  { id: "profile", label: "Profile" },
];

function matchesProfileSearch(member: MemberProfileRecord, query: string) {
  if (!query.trim()) return true;

  const haystack = [
    member.full_name,
    member.based_in,
    ...coerceProfileStringList(member.regions),
    member.primary_club,
    ...coerceProfileStringList(member.additional_clubs),
    member.industry,
    ...coerceProfileStringList(member.golf_interests),
    ...coerceProfileStringList(member.business_interests),
    member.current_request,
    member.traveling_to,
    member.membership_status,
  ]
    .join(" ")
    .toLowerCase();

  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .every((term) => haystack.includes(term));
}

export function MemberPortal() {
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isInitialLoaderVisible, setIsInitialLoaderVisible] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [activeView, setActiveView] = useState<PortalTab>("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [modal, setModal] = useState<PortalModal | null>(null);
  const [members, setMembers] = useState<MemberProfileRecord[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [introductionRequests, setIntroductionRequests] = useState<IntroductionRequestRecord[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(null);
  const [messageRequest, setMessageRequest] = useState<IntroductionRequestRecord | null>(null);
  const [introSubmitting, setIntroSubmitting] = useState(false);
  const [introError, setIntroError] = useState<string | null>(null);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [seenRequestIds, setSeenRequestIds] = useState<Set<string>>(() => new Set());
  const [portalDataLoading, setPortalDataLoading] = useState(true);

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => setIsInitialLoading(false), INITIAL_LOADER_MS);
    const hideTimer = window.setTimeout(
      () => setIsInitialLoaderVisible(false),
      INITIAL_LOADER_MS + 600,
    );

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  const refreshUnreadMessageCount = useCallback(async () => {
    const { count } = await fetchUnreadMessageCount();
    setUnreadMessageCount(count);
  }, []);

  useEffect(() => {
    let active = true;

    async function bootstrapPortalData() {
      setPortalDataLoading(true);
      setMembersLoading(true);
      setRequestsLoading(true);
      setMembersError(null);
      setRequestsError(null);

      const { userId, error: userError } = await getCurrentAuthUserId();
      if (!active) return;

      setCurrentUserId(userId);
      if (userError) {
        setRequestsError(userError.message);
      }
      if (userId) {
        setSeenRequestIds(getSeenIntroductionRequestIds(userId));
      }

      const unreadPromise = userId ? fetchUnreadMessageCount() : Promise.resolve({ count: 0, error: null });
      const [membersResult, requestsResult, unreadResult] = await Promise.all([
        fetchMemberProfiles(),
        fetchIntroductionRequests(),
        unreadPromise,
      ]);

      if (!active) return;

      if (membersResult.error) {
        setMembersError(membersResult.error.message);
        setMembers([]);
      } else {
        setMembers(membersResult.data ?? []);
      }

      if (requestsResult.error) {
        setRequestsError(requestsResult.error.message);
        setIntroductionRequests([]);
      } else {
        setIntroductionRequests(requestsResult.data ?? []);
      }

      if (!unreadResult.error) {
        setUnreadMessageCount(unreadResult.count);
      }

      setMembersLoading(false);
      setRequestsLoading(false);
      setPortalDataLoading(false);
    }

    bootstrapPortalData();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (activeView !== "members" || members.length > 0 || membersLoading) return;

    let active = true;
    setMembersLoading(true);
    setMembersError(null);

    fetchMemberProfiles().then(({ data, error }) => {
      if (!active) return;

      if (error) {
        setMembersError(error.message);
        setMembers([]);
      } else {
        setMembers(data ?? []);
      }

      setMembersLoading(false);
    });

    return () => {
      active = false;
    };
  }, [activeView, members.length, membersLoading]);

  const loadIntroductionRequests = useCallback(async () => {
    setRequestsLoading(true);
    setRequestsError(null);

    const { data, error } = await fetchIntroductionRequests();

    if (error) {
      setRequestsError(error.message);
      setIntroductionRequests([]);
    } else {
      setIntroductionRequests(data ?? []);
    }

    setRequestsLoading(false);
  }, []);

  useEffect(() => {
    if (activeView !== "requests" || !currentUserId) return;

    const pendingReceivedIds = getPendingReceivedIntroductionRequestIds(
      introductionRequests,
      currentUserId,
    );

    if (pendingReceivedIds.length === 0) return;

    markIntroductionRequestsSeen(currentUserId, pendingReceivedIds);
    setSeenRequestIds(getSeenIntroductionRequestIds(currentUserId));
  }, [activeView, currentUserId, introductionRequests]);

  const unseenIntroductionCount = useMemo(
    () =>
      countUnseenPendingIntroductionRequests({
        requests: introductionRequests,
        userId: currentUserId,
        seenRequestIds,
      }),
    [introductionRequests, currentUserId, seenRequestIds],
  );

  const requestsNotificationCount = unreadMessageCount + unseenIntroductionCount;

  const requestsNotificationLabel = useMemo(
    () =>
      buildRequestsNotificationLabel({
        unreadMessageCount,
        unseenIntroductionCount,
      }),
    [unreadMessageCount, unseenIntroductionCount],
  );

  async function handleAcceptRequest(requestId: string) {
    setUpdatingRequestId(requestId);
    setRequestsError(null);

    const { error } = await updateIntroductionRequestStatus(requestId, "accepted");

    setUpdatingRequestId(null);

    if (error) {
      setRequestsError(error.message);
      return;
    }

    if (currentUserId) {
      markIntroductionRequestsSeen(currentUserId, [requestId]);
      setSeenRequestIds(getSeenIntroductionRequestIds(currentUserId));
    }

    await loadIntroductionRequests();
  }

  async function handleDeclineRequest(requestId: string) {
    setUpdatingRequestId(requestId);
    setRequestsError(null);

    const { error } = await updateIntroductionRequestStatus(requestId, "declined");

    setUpdatingRequestId(null);

    if (error) {
      setRequestsError(error.message);
      return;
    }

    if (currentUserId) {
      markIntroductionRequestsSeen(currentUserId, [requestId]);
      setSeenRequestIds(getSeenIntroductionRequestIds(currentUserId));
    }

    await loadIntroductionRequests();
  }

  const filteredMembers = useMemo(
    () => members.filter((member) => matchesProfileSearch(member, searchQuery)),
    [members, searchQuery],
  );

  const homeStats = useMemo(
    () => [
      { value: String(members.length), label: "Verified Network" },
      {
        value: String(introductionRequests.filter((request) => request.status === "pending").length),
        label: "Pending Introductions",
      },
      {
        value: String(introductionRequests.filter((request) => request.status === "accepted").length),
        label: "Active Connections",
      },
    ],
    [members.length, introductionRequests],
  );

  const homeOpportunities = useMemo(
    () =>
      introductionRequests
        .filter((request) => request.status === "pending")
        .slice(0, 3)
        .map((request) => ({
          id: request.id,
          category: request.request_type,
          text: request.message,
        })),
    [introductionRequests],
  );

  const networkSummary = useMemo(() => {
    if (!currentUserId) {
      return {
        pendingReceived: 0,
        activeConnections: 0,
        outboundPending: 0,
      };
    }

    return {
      pendingReceived: introductionRequests.filter(
        (request) => request.status === "pending" && request.receiver_id === currentUserId,
      ).length,
      activeConnections: introductionRequests.filter(
        (request) =>
          request.status === "accepted" &&
          (request.sender_id === currentUserId || request.receiver_id === currentUserId),
      ).length,
      outboundPending: introductionRequests.filter(
        (request) => request.status === "pending" && request.sender_id === currentUserId,
      ).length,
    };
  }, [currentUserId, introductionRequests]);

  const showLoader = isInitialLoaderVisible || isTransitioning;

  async function handleSignOut() {
    setIsSigningOut(true);
    if (supabase) {
      await supabase.auth.signOut();
    }
    navigate("/login", { replace: true });
  }

  function closeModal() {
    setModal(null);
    setIntroError(null);
    setIntroSubmitting(false);
  }

  function openIntroRequestModal(member: MemberProfileRecord) {
    setIntroError(null);
    setModal({ type: "intro-request", member });
  }

  function openProfileModal(member: MemberProfileRecord) {
    setModal({
      type: "profile",
      member: normalizeMemberProfileRecord(member as unknown as Record<string, unknown>),
    });
  }

  async function handleIntroSubmit(
    member: MemberProfileRecord,
    payload: { requestType: IntroductionRequestType; message: string },
  ) {
    setIntroSubmitting(true);
    setIntroError(null);

    const { error } = await createIntroductionRequest({
      receiverMember: member,
      requestType: payload.requestType,
      message: payload.message,
    });

    setIntroSubmitting(false);

    if (error) {
      setIntroError(error.message);
      return;
    }

    setModal({ type: "intro-success", memberName: member.full_name });
  }

  function transitionTo(view: PortalTab) {
    if (view === activeView) return;

    setIsTransitioning(true);
    window.setTimeout(() => {
      setActiveView(view);
      window.setTimeout(() => setIsTransitioning(false), TAB_TRANSITION_MS);
    }, TAB_TRANSITION_MS * 0.45);
  }

  function handleTabChange(tab: PortalTab) {
    transitionTo(tab);
  }

  function handleHomeSearchSubmit() {
    transitionTo("members");
  }

  return (
    <div className="inside-page portal-page">
      {showLoader ? (
        <div
          className={`portal-loader${isInitialLoading || isTransitioning ? "" : " is-fading"}`}
          aria-hidden="true"
        >
          <span className="inside-logo-mark portal-loader-logo" />
        </div>
      ) : null}

      <header className="portal-top">
        <button
          type="button"
          className="portal-logo-link"
          aria-label="EliteTee member portal home"
          onClick={() => transitionTo("home")}
        >
          <span className="inside-logo-mark portal-logo-mark" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="portal-btn portal-btn--gold portal-signout"
          onClick={handleSignOut}
          disabled={isSigningOut}
        >
          {isSigningOut ? "Signing out..." : "Sign Out"}
        </button>
      </header>

      <nav className="portal-tabs" aria-label="Private member portal">
        {portalTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`portal-tab${activeView === tab.id ? " is-active" : ""}`}
            onClick={() => handleTabChange(tab.id)}
            aria-current={activeView === tab.id ? "page" : undefined}
          >
            <span className="portal-tab-label">
              {tab.label}
              {tab.id === "requests" && requestsNotificationCount > 0 ? (
                <span
                  className="portal-tab-badge"
                  aria-label={requestsNotificationLabel}
                  title={requestsNotificationLabel}
                >
                  {formatNotificationCount(requestsNotificationCount)}
                </span>
              ) : null}
            </span>
          </button>
        ))}
      </nav>

      <main className={`portal-main${isInitialLoading ? " is-loading" : ""}`}>
        {activeView === "home" ? (
          <PortalHome
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSearchSubmit={handleHomeSearchSubmit}
            onViewOpportunity={() => transitionTo("requests")}
            stats={homeStats}
            opportunities={homeOpportunities}
            isLoading={portalDataLoading}
          />
        ) : null}

        {activeView === "members" ? (
          <section className="portal-directory" aria-labelledby="members-heading">
            <header className="portal-section-head">
              <h2 id="members-heading">The Verified Network</h2>
              <p>Discreetly explore private club members within the EliteTee circle.</p>
            </header>
            <label className="portal-search-label">
              <span className="visually-hidden">Search the verified network</span>
              <input
                type="search"
                className="portal-search-input"
                placeholder="Search clubs, destinations, industries..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>

            {membersLoading ? (
              <p className="portal-empty">Retrieving the verified network...</p>
            ) : membersError ? (
              <p className="portal-alert portal-alert--error" role="alert">
                {membersError}
              </p>
            ) : members.length === 0 ? (
              <p className="portal-empty portal-empty--directory">
                The verified network will appear here as memberships are confirmed.
              </p>
            ) : (
              <>
                <ul className="portal-member-grid">
                  {filteredMembers.map((member) => (
                    <li key={member.id}>
                      <MemberCard
                        member={member}
                        onViewProfile={openProfileModal}
                        onRequest={openIntroRequestModal}
                      />
                    </li>
                  ))}
                </ul>
                {filteredMembers.length === 0 ? (
                  <p className="portal-empty">No members match this inquiry at present.</p>
                ) : null}
              </>
            )}
          </section>
        ) : null}

        {activeView === "requests" ? (
          <section className="portal-requests" aria-labelledby="requests-heading">
            <header className="portal-section-head">
              <h2 id="requests-heading">Member Introductions</h2>
              <p>
                Private introduction requests within the EliteTee network.
              </p>
            </header>

            {requestsLoading ? (
              <p className="portal-empty">Retrieving member introductions...</p>
            ) : requestsError ? (
              <p className="portal-alert portal-alert--error" role="alert">
                {requestsError}
              </p>
            ) : introductionRequests.length === 0 ? (
              <p className="portal-empty portal-empty--directory">
                Private introductions will appear here once initiated.
              </p>
            ) : (
              <RequestsBoard
                requests={introductionRequests}
                currentUserId={currentUserId}
                updatingRequestId={updatingRequestId}
                onAccept={handleAcceptRequest}
                onDecline={handleDeclineRequest}
                onMessageMember={setMessageRequest}
              />
            )}
          </section>
        ) : null}

        {messageRequest && currentUserId ? (
          <PrivateMessageModal
            request={messageRequest}
            currentUserId={currentUserId}
            onClose={() => {
              setMessageRequest(null);
              void refreshUnreadMessageCount();
            }}
            onMessagesRead={refreshUnreadMessageCount}
          />
        ) : null}

        {activeView === "network" ? (
          <section className="portal-network" aria-labelledby="network-heading">
            <header className="portal-section-head">
              <h2 id="network-heading">Connections</h2>
              <p>Your private introductions and established relationships.</p>
            </header>
            <div className="portal-network-grid">
              <article className="portal-panel-card portal-panel-card--network">
                <h3>Pending Introductions</h3>
                <p>
                  {networkSummary.pendingReceived === 0
                    ? "Introductions awaiting your review will appear here."
                    : `${networkSummary.pendingReceived} introduction${networkSummary.pendingReceived === 1 ? "" : "s"} awaiting your review.`}
                </p>
              </article>
              <article className="portal-panel-card portal-panel-card--network">
                <h3>Active Connections</h3>
                <p>
                  {networkSummary.activeConnections === 0
                    ? "Approved private connections will appear here."
                    : `${networkSummary.activeConnections} active connection${networkSummary.activeConnections === 1 ? "" : "s"} within your network.`}
                </p>
              </article>
              <article className="portal-panel-card portal-panel-card--network">
                <h3>Outbound Introductions</h3>
                <p>
                  {networkSummary.outboundPending === 0
                    ? "Outbound introductions awaiting response will appear here."
                    : `${networkSummary.outboundPending} outbound introduction${networkSummary.outboundPending === 1 ? "" : "s"} awaiting response.`}
                </p>
              </article>
            </div>
          </section>
        ) : null}

        {activeView === "profile" ? (
          <section className="portal-profile" aria-labelledby="profile-heading">
            <header className="portal-section-head portal-section-head--profile">
              <h2 id="profile-heading">Private Dossier</h2>
              <p>Your confidential profile within the EliteTee network.</p>
            </header>
            <ProfileDossier isActive={activeView === "profile"} />
          </section>
        ) : null}

        <section className="portal-privacy">
          <p>{privacyCopy}</p>
        </section>
      </main>

      {modal ? (
        <div className="portal-modal" role="dialog" aria-modal="true" aria-labelledby="portal-modal-title">
          <button
            type="button"
            className="portal-modal-backdrop"
            aria-label="Close dialog"
            onClick={closeModal}
          />
          <div
            className={`portal-modal-card${
              modal.type === "profile" ? " portal-modal-card--wide portal-modal-card--dossier" : ""
            }`}
          >
            {modal.type === "intro-request" ? (
              <IntroductionRequestForm
                member={modal.member}
                isSubmitting={introSubmitting}
                errorMessage={introError}
                onSubmit={(payload) => handleIntroSubmit(modal.member, payload)}
                onCancel={closeModal}
              />
            ) : null}

            {modal.type === "intro-success" ? (
              <>
                <p className="portal-eyebrow">EliteTee Private Network</p>
                <h3 id="portal-modal-title">Introduction Submitted</h3>
                <p className="portal-alert portal-alert--success" role="status">
                  Your private introduction to {modal.memberName} has been submitted for review.
                </p>
                <button type="button" className="portal-btn portal-btn--gold" onClick={closeModal}>
                  Close
                </button>
              </>
            ) : null}

            {modal.type === "profile" ? (
              <div className="portal-modal-dossier">
                <h3 id="portal-modal-title" className="visually-hidden">
                  {modal.member.full_name} private dossier
                </h3>
                <div className="portal-modal-dossier-scroll">
                  <MemberProfileModalContent
                    member={modal.member}
                    onRequest={(member) => {
                      setModal({ type: "intro-request", member });
                      setIntroError(null);
                    }}
                  />
                </div>
                <div className="portal-modal-dossier-footer">
                  <button
                    type="button"
                    className="portal-btn portal-btn--outline portal-modal-secondary"
                    onClick={closeModal}
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
