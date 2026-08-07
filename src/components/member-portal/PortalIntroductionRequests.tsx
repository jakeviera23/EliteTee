import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { introductionsCopy } from "../../data/portalSocial";
import {
  cancelIntroductionRequest,
  fetchIntroductionRequests,
  updateIntroductionRequestStatus,
} from "../../lib/introductionRequests";
import {
  categorizeIntroductionRequests,
  countIntroductionTabs,
  pickDefaultIntroductionTab,
  resolveDirectMessageTarget,
  type IntroductionTab,
} from "../../lib/introductionBoard";
import {
  fetchDiscoverablePortalMembers,
  fetchApprovedMemberProfilesByUserIds,
  fetchOwnMemberProfile,
  type ApprovedMemberDirectoryProfile,
} from "../../lib/memberProfiles";
import { getMemberPrimaryClub } from "../../lib/discoverDirectory";
import { buildIntroductionRecommendations } from "../../lib/introductionRecommendations";
import { getCurrentAuthUserId } from "../../lib/authUserLinking";
import { memberFacingPortalError } from "../../lib/portalErrorDisplay";
import type { IntroductionRequestRecord } from "../../types/introductionRequest";
import type { ViewMemberProfileHandler } from "../../types/memberProfileNavigation";
import { IntroductionRequestCard } from "./introductions/IntroductionRequestCard";
import { IntroductionRequestModal } from "./IntroductionRequestModal";
import { MemberClubAvatar } from "./MemberClubAvatar";
import type { MemberProfileRecord } from "../../types/memberProfileRecord";
import "../../member-portal-introductions.css";

type PortalIntroductionRequestsProps = {
  isActive: boolean;
  initialTab?: IntroductionTab | null;
  onInitialTabConsumed?: () => void;
  onMessageMember: (userId: string, memberName: string) => void;
  onViewMemberProfile?: ViewMemberProfileHandler;
  onRequestsChange?: (requests: IntroductionRequestRecord[]) => void;
  onDiscoverMembers?: () => void;
};

const TAB_LABELS: Record<IntroductionTab, string> = {
  incoming: introductionsCopy.incoming,
  sent: introductionsCopy.sent,
  accepted: introductionsCopy.accepted,
  declined: introductionsCopy.declined,
};

const EMPTY_COPY: Record<IntroductionTab, { title: string; copy: string }> = {
  incoming: {
    title: introductionsCopy.emptyIncomingTitle,
    copy: introductionsCopy.emptyIncomingCopy,
  },
  sent: {
    title: introductionsCopy.emptySentTitle,
    copy: introductionsCopy.emptySentCopy,
  },
  accepted: {
    title: introductionsCopy.emptyAcceptedTitle,
    copy: introductionsCopy.emptyAcceptedCopy,
  },
  declined: {
    title: introductionsCopy.emptyDeclinedTitle,
    copy: introductionsCopy.emptyDeclinedCopy,
  },
};

export function PortalIntroductionRequests({
  isActive,
  initialTab,
  onInitialTabConsumed,
  onMessageMember,
  onViewMemberProfile,
  onRequestsChange,
  onDiscoverMembers,
}: PortalIntroductionRequestsProps) {
  const [requests, setRequests] = useState<IntroductionRequestRecord[]>([]);
  const [profilesByUserId, setProfilesByUserId] = useState<
    Record<string, ApprovedMemberDirectoryProfile>
  >({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<IntroductionTab>("incoming");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [viewerProfile, setViewerProfile] = useState<MemberProfileRecord | null>(null);
  const [discoverableMembers, setDiscoverableMembers] = useState<MemberProfileRecord[]>([]);
  const [recommendedMember, setRecommendedMember] = useState<MemberProfileRecord | null>(null);
  const onRequestsChangeRef = useRef(onRequestsChange);

  useEffect(() => {
    onRequestsChangeRef.current = onRequestsChange;
  }, [onRequestsChange]);

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const [{ userId }, { data, error }, ownProfileResult, membersResult] = await Promise.all([
        getCurrentAuthUserId(),
        fetchIntroductionRequests(),
        fetchOwnMemberProfile(),
        fetchDiscoverablePortalMembers(),
      ]);

      setCurrentUserId(userId ?? null);

      if (error) {
        console.error("[PortalIntroductionRequests] failed to load requests", error.message);
        setLoadError(introductionsCopy.loadErrorCopy);
        setRequests([]);
        setProfilesByUserId({});
        return;
      }

      const nextRequests = data ?? [];
      setRequests(nextRequests);
      setViewerProfile(ownProfileResult.data ?? null);
      setDiscoverableMembers(membersResult.data ?? []);
      onRequestsChangeRef.current?.(nextRequests);

      const participantIds = [
        ...new Set(nextRequests.flatMap((request) => [request.sender_id, request.receiver_id])),
      ];

      if (participantIds.length > 0) {
        try {
          const { data: profiles } = await fetchApprovedMemberProfilesByUserIds(participantIds);
          const nextProfiles: Record<string, ApprovedMemberDirectoryProfile> = {};
          for (const profile of profiles ?? []) {
            const profileUserId = profile.user_id?.trim();
            if (profileUserId) {
              nextProfiles[profileUserId] = profile;
            }
          }
          setProfilesByUserId(nextProfiles);
        } catch (profileError) {
          console.error("[PortalIntroductionRequests] failed to load member profiles", profileError);
          setProfilesByUserId({});
        }
      } else {
        setProfilesByUserId({});
      }
    } catch (unexpectedError) {
      console.error("[PortalIntroductionRequests] unexpected load failure", unexpectedError);
      setLoadError(introductionsCopy.loadErrorCopy);
      setRequests([]);
      setProfilesByUserId({});
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isActive) return;
    void loadRequests();
  }, [isActive, loadRequests]);

  useEffect(() => {
    if (!isActive || !initialTab) return;
    setActiveTab(initialTab);
    onInitialTabConsumed?.();
  }, [initialTab, isActive, onInitialTabConsumed]);

  const categorized = useMemo(
    () => categorizeIntroductionRequests(requests, currentUserId),
    [currentUserId, requests],
  );

  const tabCounts = useMemo(() => countIntroductionTabs(categorized), [categorized]);

  useEffect(() => {
    if (isLoading || initialTab) return;
    setActiveTab((current) => {
      if (tabCounts[current] > 0) return current;
      return pickDefaultIntroductionTab(categorized);
    });
  }, [categorized, initialTab, isLoading, tabCounts]);

  const activeRequests = categorized[activeTab];
  const hasAnyRequests = requests.length > 0;
  const recommendations = useMemo(
    () =>
      buildIntroductionRecommendations({
        viewer: viewerProfile,
        members: discoverableMembers,
        requests,
      }),
    [discoverableMembers, requests, viewerProfile],
  );

  async function handleAccept(requestId: string) {
    setUpdatingRequestId(requestId);
    setActionError(null);
    setActionNotice(null);

    const { error } = await updateIntroductionRequestStatus(requestId, "accepted");

    setUpdatingRequestId(null);

    if (error) {
      setActionError(memberFacingPortalError(error.message, "introduction"));
      return;
    }

    setActionNotice(introductionsCopy.acceptSuccess);
    setActiveTab("accepted");
    await loadRequests();
  }

  async function handleDecline(requestId: string) {
    setUpdatingRequestId(requestId);
    setActionError(null);
    setActionNotice(null);

    const { error } = await updateIntroductionRequestStatus(requestId, "declined");

    setUpdatingRequestId(null);

    if (error) {
      setActionError(memberFacingPortalError(error.message, "introduction"));
      return;
    }

    setActiveTab("declined");
    await loadRequests();
  }

  async function handleCancel(requestId: string) {
    setUpdatingRequestId(requestId);
    setActionError(null);
    setActionNotice(null);

    const { error } = await cancelIntroductionRequest(requestId);

    setUpdatingRequestId(null);

    if (error) {
      setActionError(memberFacingPortalError(error.message, "introduction"));
      return;
    }

    setActionNotice(introductionsCopy.cancelSuccess);
    setActiveTab("declined");
    await loadRequests();
  }

  function handleMessageMember(request: IntroductionRequestRecord) {
    if (!currentUserId) return;
    const target = resolveDirectMessageTarget(request, currentUserId);
    onMessageMember(target.userId, target.memberName);
  }

  return (
    <section className="et-introductions" aria-labelledby="introduction-requests-heading">
      <header className="et-introductions-header">
        <p className="et-introductions-eyebrow">{introductionsCopy.eyebrow}</p>
        <h2 id="introduction-requests-heading" className="et-introductions-title">
          {introductionsCopy.title}
        </h2>
        <p className="et-introductions-lead">{introductionsCopy.lead}</p>
        {!isLoading && !loadError && hasAnyRequests ? (
          <div className="et-introductions-summary">
            <span className="et-introductions-summary-pill">
              Incoming pending: <strong>{tabCounts.incoming}</strong>
            </span>
            <span className="et-introductions-summary-pill">
              Sent pending: <strong>{tabCounts.sent}</strong>
            </span>
          </div>
        ) : null}
      </header>

      {actionError ? (
        <p className="et-introductions-alert et-introductions-alert--error" role="alert">
          {actionError}
        </p>
      ) : null}

      {actionNotice ? (
        <p className="et-introductions-alert et-introductions-alert--success" role="status">
          {actionNotice}
        </p>
      ) : null}

      {!isLoading && !loadError && recommendations.length > 0 ? (
        <section className="et-introductions-recommendations" aria-labelledby="recommended-introductions-heading">
          <div className="et-introductions-recommendations-head">
            <div>
              <p className="et-introductions-recommendations-eyebrow">Your network concierge</p>
              <h3 id="recommended-introductions-heading">Members worth knowing</h3>
            </div>
            <p>Selected from real overlap in your clubs, location, travel, and interests.</p>
          </div>
          <ul className="et-introductions-recommendations-list">
            {recommendations.map(({ member, reasons }) => (
              <li key={member.user_id ?? member.id} className="et-introductions-recommendation">
                <button
                  type="button"
                  className="et-introductions-recommendation-identity"
                  onClick={() => member.user_id && onViewMemberProfile?.(member.user_id, member.full_name)}
                >
                  <MemberClubAvatar member={member} name={member.full_name} size="md" />
                  <span>
                    <strong>{member.full_name}</strong>
                    <small>
                      {[getMemberPrimaryClub(member), member.based_in.trim()]
                        .filter(Boolean)
                        .join(" · ")}
                    </small>
                  </span>
                </button>
                <div className="et-introductions-recommendation-reasons" aria-label="Why this member is recommended">
                  {reasons.map((reason) => <span key={reason}>{reason}</span>)}
                </div>
                <button
                  type="button"
                  className="et-btn et-btn--forest et-btn--sm"
                  onClick={() => setRecommendedMember(member)}
                >
                  Request introduction
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {isLoading ? (
        <p className="et-introductions-loading" aria-live="polite">
          {introductionsCopy.loading}
        </p>
      ) : null}

      {!isLoading && loadError ? (
        <div className="et-introductions-error" role="alert">
          <p className="et-introductions-error-title">{introductionsCopy.loadErrorTitle}</p>
          <p className="et-introductions-error-copy">{loadError}</p>
          <button
            type="button"
            className="et-btn et-btn--secondary et-btn--sm"
            onClick={() => void loadRequests()}
          >
            {introductionsCopy.retryLoad}
          </button>
        </div>
      ) : null}

      {!isLoading && !loadError && !hasAnyRequests && recommendations.length === 0 ? (
        <div className="et-introductions-empty et-introductions-empty--global">
          <p className="et-introductions-empty-eyebrow" aria-hidden="true">
            ◎
          </p>
          <p className="et-introductions-empty-title">{introductionsCopy.emptyAllTitle}</p>
          <p className="et-introductions-empty-copy">{introductionsCopy.emptyAllCopy}</p>
          {onDiscoverMembers ? (
            <button type="button" className="et-btn et-btn--forest et-btn--sm" onClick={onDiscoverMembers}>
              Discover members
            </button>
          ) : null}
        </div>
      ) : null}

      {!isLoading && !loadError && hasAnyRequests ? (
        <section className="et-introductions-desk" aria-labelledby="introduction-desk-heading">
          <header className="et-introductions-desk-head">
            <div>
              <p>Your introductions</p>
              <h3 id="introduction-desk-heading">Requests and connections</h3>
            </div>
            <span>Review what needs attention and continue accepted connections.</span>
          </header>
          <div className="et-introductions-tabs" role="tablist" aria-label="Introduction request status">
            {(Object.keys(TAB_LABELS) as IntroductionTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                id={`introduction-tab-${tab}`}
                aria-selected={activeTab === tab}
                aria-controls={`introduction-panel-${tab}`}
                className={`et-introductions-tab${activeTab === tab ? " is-active" : ""}`}
                onClick={() => {
                  setActionNotice(null);
                  setActiveTab(tab);
                }}
              >
                {TAB_LABELS[tab]}
                <span className="et-introductions-tab-count">{tabCounts[tab]}</span>
              </button>
            ))}
          </div>

          <div
            className="et-introductions-panel"
            role="tabpanel"
            id={`introduction-panel-${activeTab}`}
            aria-labelledby={`introduction-tab-${activeTab}`}
          >
            {activeRequests.length === 0 ? (
              <div className="et-introductions-empty">
                <p className="et-introductions-empty-title">{EMPTY_COPY[activeTab].title}</p>
                <p className="et-introductions-empty-copy">{EMPTY_COPY[activeTab].copy}</p>
              </div>
            ) : (
              <ul className="et-introductions-list">
                {activeRequests.map((request) => {
                  const counterpartUserId =
                    request.sender_id === currentUserId
                      ? request.receiver_id
                      : request.sender_id;

                  return (
                    <li key={request.id}>
                      <IntroductionRequestCard
                        request={request}
                        currentUserId={currentUserId}
                        profile={profilesByUserId[counterpartUserId]}
                        updatingRequestId={updatingRequestId}
                        onAccept={handleAccept}
                        onDecline={handleDecline}
                        onCancel={handleCancel}
                        onMessageMember={handleMessageMember}
                        onViewMemberProfile={onViewMemberProfile}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      ) : null}

      {recommendedMember ? (
        <IntroductionRequestModal
          member={recommendedMember}
          onClose={() => setRecommendedMember(null)}
          onSubmitted={() => {
            setActionNotice(`Introduction requested with ${recommendedMember.full_name}.`);
            void loadRequests();
          }}
        />
      ) : null}
    </section>
  );
}
