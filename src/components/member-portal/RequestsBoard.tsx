import type { IntroductionRequestRecord } from "../../types/introductionRequest";

type RequestsBoardProps = {
  requests: IntroductionRequestRecord[];
  currentUserId: string | null;
  updatingRequestId: string | null;
  onAccept: (requestId: string) => void;
  onDecline: (requestId: string) => void;
  onMessageMember: (request: IntroductionRequestRecord) => void;
};

function formatRequestStatus(status: string) {
  const normalized = status.trim().toLowerCase();
  if (normalized === "accepted") return "Accepted";
  if (normalized === "declined") return "Declined";
  return "Pending";
}

function formatRequestDate(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return createdAt;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getStatusBadgeClass(status: string) {
  const normalized = status.trim().toLowerCase();
  if (normalized === "accepted") return "portal-request-badge--accepted";
  if (normalized === "declined") return "portal-request-badge--declined";
  return "portal-request-badge--pending";
}

export function RequestsBoard({
  requests,
  currentUserId,
  updatingRequestId,
  onAccept,
  onDecline,
  onMessageMember,
}: RequestsBoardProps) {
  return (
    <ul className="portal-requests-list">
      {requests.map((request) => {
        const normalizedStatus = request.status.toLowerCase();
        const isParticipant =
          currentUserId !== null &&
          (request.sender_id === currentUserId || request.receiver_id === currentUserId);
        const isReceiver =
          currentUserId !== null &&
          request.receiver_id === currentUserId &&
          normalizedStatus === "pending";
        const canMessage = isParticipant && normalizedStatus === "accepted";
        const isUpdating = updatingRequestId === request.id;
        const isIncoming =
          currentUserId !== null && request.receiver_id === currentUserId;

        return (
          <li key={request.id}>
            <article className="portal-request-card">
              <p className="portal-request-type">{request.request_type}</p>
              <p className="portal-request-text">{request.message}</p>
              <p className="portal-request-meta">
                <span>From {request.sender_name ?? "Private Member"}</span>
                <span>To {request.receiver_name ?? "Private Member"}</span>
              </p>
              {normalizedStatus === "accepted" ? (
                <p className="portal-request-complete-note">Introduction completed</p>
              ) : null}
              <div className="portal-request-footer">
                <p className={`portal-request-badge ${getStatusBadgeClass(request.status)}`}>
                  {formatRequestStatus(request.status)}
                </p>
                <p className="portal-request-date">{formatRequestDate(request.created_at)}</p>
              </div>
              {isReceiver ? (
                <div className="portal-request-actions">
                  <button
                    type="button"
                    className="portal-btn portal-btn--gold"
                    onClick={() => onAccept(request.id)}
                    disabled={isUpdating}
                  >
                    {isUpdating ? "Updating…" : "Accept"}
                  </button>
                  <button
                    type="button"
                    className="portal-btn portal-btn--outline"
                    onClick={() => onDecline(request.id)}
                    disabled={isUpdating}
                  >
                    Decline
                  </button>
                </div>
              ) : null}
              {canMessage ? (
                <div className="portal-request-actions">
                  <button
                    type="button"
                    className="portal-btn portal-btn--gold"
                    onClick={() => onMessageMember(request)}
                  >
                    {isIncoming ? "Message Sender" : "Message Member"}
                  </button>
                </div>
              ) : null}
            </article>
          </li>
        );
      })}
    </ul>
  );
}
