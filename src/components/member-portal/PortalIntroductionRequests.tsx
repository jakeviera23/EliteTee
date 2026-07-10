import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchIntroductionRequests,
  updateIntroductionRequestStatus,
} from "../../lib/introductionRequests";
import { getCurrentAuthUserId } from "../../lib/authUserLinking";
import type { IntroductionRequestRecord } from "../../types/introductionRequest";
import { RequestsBoard } from "./RequestsBoard";

type PortalIntroductionRequestsProps = {
  isActive: boolean;
  onMessageMember: (userId: string, memberName: string) => void;
  onPendingCountChange?: (count: number) => void;
};

function countPendingIncoming(
  requests: IntroductionRequestRecord[],
  currentUserId: string | null,
) {
  if (!currentUserId) return 0;

  return requests.filter(
    (request) =>
      request.status.toLowerCase() === "pending" && request.receiver_id === currentUserId,
  ).length;
}

function filterByStatus(requests: IntroductionRequestRecord[], status: string) {
  return requests.filter((request) => request.status.toLowerCase() === status);
}

export function PortalIntroductionRequests({
  isActive,
  onMessageMember,
  onPendingCountChange,
}: PortalIntroductionRequestsProps) {
  const [requests, setRequests] = useState<IntroductionRequestRecord[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    const [{ userId }, { data, error }] = await Promise.all([
      getCurrentAuthUserId(),
      fetchIntroductionRequests(),
    ]);

    setCurrentUserId(userId ?? null);

    if (error) {
      console.error("[PortalIntroductionRequests] failed to load requests", error.message);
      setLoadError("Introduction requests could not be loaded right now.");
      setRequests([]);
      setIsLoading(false);
      onPendingCountChange?.(0);
      return;
    }

    const nextRequests = data ?? [];
    setRequests(nextRequests);
    onPendingCountChange?.(countPendingIncoming(nextRequests, userId ?? null));
    setIsLoading(false);
  }, [onPendingCountChange]);

  useEffect(() => {
    if (!isActive) return;
    void loadRequests();
  }, [isActive, loadRequests]);

  const pending = useMemo(() => filterByStatus(requests, "pending"), [requests]);
  const accepted = useMemo(() => filterByStatus(requests, "accepted"), [requests]);
  const declined = useMemo(() => filterByStatus(requests, "declined"), [requests]);

  const hasAnyRequests = requests.length > 0;

  async function handleAccept(requestId: string) {
    setUpdatingRequestId(requestId);
    setActionError(null);

    const { error } = await updateIntroductionRequestStatus(requestId, "accepted");

    setUpdatingRequestId(null);

    if (error) {
      setActionError(error.message);
      return;
    }

    await loadRequests();
  }

  async function handleDecline(requestId: string) {
    setUpdatingRequestId(requestId);
    setActionError(null);

    const { error } = await updateIntroductionRequestStatus(requestId, "declined");

    setUpdatingRequestId(null);

    if (error) {
      setActionError(error.message);
      return;
    }

    await loadRequests();
  }

  function handleMessageMember(request: IntroductionRequestRecord) {
    if (!currentUserId) return;

    const otherUserId =
      request.sender_id === currentUserId ? request.receiver_id : request.sender_id;
    const otherUserName =
      request.sender_id === currentUserId
        ? (request.receiver_name ?? "Member")
        : (request.sender_name ?? "Member");

    onMessageMember(otherUserId, otherUserName);
  }

  return (
    <section
      className="portal-social-page portal-requests-page"
      aria-labelledby="introduction-requests-heading"
    >
      <header className="portal-section-head portal-section-head--social portal-section-head--compact">
        <h2 id="introduction-requests-heading">Introduction Requests</h2>
        <p className="portal-requests-lead">
          Private introductions between members. Requests remain discreet until accepted.
        </p>
      </header>

      {loadError ? (
        <p className="portal-alert portal-alert--warning" role="alert">
          {loadError}
        </p>
      ) : null}

      {actionError ? (
        <p className="portal-alert portal-alert--error" role="alert">
          {actionError}
        </p>
      ) : null}

      {isLoading ? <p className="portal-discover-loading">Loading introduction requests…</p> : null}

      {!isLoading && !hasAnyRequests && !loadError ? (
        <div className="portal-empty portal-empty--introductions">
          <p className="portal-empty-title">No introduction requests yet.</p>
          <p className="portal-empty-hint">Requests you send or receive will appear here.</p>
        </div>
      ) : null}

      {!isLoading && pending.length > 0 ? (
        <section className="portal-requests-section" aria-labelledby="pending-requests-heading">
          <h3 id="pending-requests-heading" className="discover-section-title">
            Pending
          </h3>
          <RequestsBoard
            requests={pending}
            currentUserId={currentUserId}
            updatingRequestId={updatingRequestId}
            onAccept={handleAccept}
            onDecline={handleDecline}
            onMessageMember={handleMessageMember}
          />
        </section>
      ) : null}

      {!isLoading && accepted.length > 0 ? (
        <section className="portal-requests-section" aria-labelledby="accepted-requests-heading">
          <h3 id="accepted-requests-heading" className="discover-section-title">
            Accepted
          </h3>
          <RequestsBoard
            requests={accepted}
            currentUserId={currentUserId}
            updatingRequestId={updatingRequestId}
            onAccept={handleAccept}
            onDecline={handleDecline}
            onMessageMember={handleMessageMember}
          />
        </section>
      ) : null}

      {!isLoading && declined.length > 0 ? (
        <section className="portal-requests-section" aria-labelledby="declined-requests-heading">
          <h3 id="declined-requests-heading" className="discover-section-title">
            Declined
          </h3>
          <RequestsBoard
            requests={declined}
            currentUserId={currentUserId}
            updatingRequestId={updatingRequestId}
            onAccept={handleAccept}
            onDecline={handleDecline}
            onMessageMember={handleMessageMember}
          />
        </section>
      ) : null}
    </section>
  );
}
