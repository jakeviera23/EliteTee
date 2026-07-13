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
  fetchApprovedMemberProfilesByUserIds,
  type ApprovedMemberDirectoryProfile,
} from "../../lib/memberProfiles";
import { getCurrentAuthUserId } from "../../lib/authUserLinking";
import { memberFacingPortalError } from "../../lib/portalErrorDisplay";
import type { IntroductionRequestRecord } from "../../types/introductionRequest";
import type { ViewMemberProfileHandler } from "../../types/memberProfileNavigation";
import { IntroductionRequestCard } from "./introductions/IntroductionRequestCard";
import "../../member-portal-introductions.css";

type PortalIntroductionRequestsProps = {
  isActive: boolean;
  initialTab?: IntroductionTab | null;
  onInitialTabConsumed?: () => void;
  onMessageMember: (userId: string, memberName: string) => void;
  onViewMemberProfile?: ViewMemberProfileHandler;
  onRequestsChange?: (requests: IntroductionRequestRecord[]) => void;
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
  const onRequestsChangeRef = useRef(onRequestsChange);

  useEffect(() => {
    onRequestsChangeRef.current = onRequestsChange;
  }, [onRequestsChange]);

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const [{ userId }, { data, error }] = await Promise.all([
        getCurrentAuthUserId(),
        fetchIntroductionRequests(),
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

      {!isLoading && !loadError && !hasAnyRequests ? (
        <div className="et-introductions-empty et-introductions-empty--global">
          <p className="et-introductions-empty-eyebrow" aria-hidden="true">
            ◎
          </p>
          <p className="et-introductions-empty-title">{introductionsCopy.emptyAllTitle}</p>
          <p className="et-introductions-empty-copy">{introductionsCopy.emptyAllCopy}</p>
        </div>
      ) : null}

      {!isLoading && !loadError && hasAnyRequests ? (
        <>
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
        </>
      ) : null}
    </section>
  );
}
