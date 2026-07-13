import type { ApprovedMemberDirectoryProfile } from "../../../lib/memberProfiles";
import { introductionsCopy } from "../../../data/portalSocial";
import type { IntroductionRequestRecord } from "../../../types/introductionRequest";
import type { ViewMemberProfileHandler } from "../../../types/memberProfileNavigation";
import {
  buildIntroductionTimeline,
  getIntroductionCounterpart,
} from "../../../lib/introductionBoard";
import { MemberClubAvatar } from "../MemberClubAvatar";

type IntroductionRequestCardProps = {
  request: IntroductionRequestRecord;
  currentUserId: string | null;
  profile?: ApprovedMemberDirectoryProfile;
  updatingRequestId: string | null;
  onAccept: (requestId: string) => void;
  onDecline: (requestId: string) => void;
  onCancel: (requestId: string) => void;
  onMessageMember: (request: IntroductionRequestRecord) => void;
  onViewMemberProfile?: ViewMemberProfileHandler;
};

function formatRequestDate(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return createdAt;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function statusBadgeClass(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "accepted") return "et-introductions-badge--accepted";
  if (normalized === "declined") return "et-introductions-badge--declined";
  return "et-introductions-badge--pending";
}

function formatStatusLabel(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "accepted") return introductionsCopy.accepted;
  if (normalized === "declined") return introductionsCopy.declined;
  return "Pending";
}

export function IntroductionRequestCard({
  request,
  currentUserId,
  profile,
  updatingRequestId,
  onAccept,
  onDecline,
  onCancel,
  onMessageMember,
  onViewMemberProfile,
}: IntroductionRequestCardProps) {
  if (!currentUserId) return null;

  const normalizedStatus = request.status.toLowerCase();
  const counterpart = getIntroductionCounterpart(request, currentUserId);
  const isIncomingPending =
    normalizedStatus === "pending" && request.receiver_id === currentUserId;
  const isSentPending =
    normalizedStatus === "pending" && request.sender_id === currentUserId;
  const canMessage = normalizedStatus === "accepted";
  const isUpdating = updatingRequestId === request.id;
  const timeline = buildIntroductionTimeline(request);

  const clubLocation = [profile?.primary_club, profile?.based_in].filter(Boolean).join(" · ");

  return (
    <article className="et-introductions-card">
      <header className="et-introductions-card-head">
        <MemberClubAvatar
          member={{ club_logo_url: profile?.club_logo_url ?? null }}
          name={counterpart.name}
          size="sm"
        />
        <div className="et-introductions-card-identity">
          <h3 className="et-introductions-card-name">{counterpart.name}</h3>
          {clubLocation ? <p className="et-introductions-card-meta">{clubLocation}</p> : null}
          <div className="et-introductions-badges">
            {profile?.is_verified ? (
              <span className="et-introductions-badge et-introductions-badge--accepted">
                Verified
              </span>
            ) : null}
            {profile?.founding_member_number ? (
              <span className="et-introductions-badge et-introductions-badge--gold">
                {profile.founding_member_number}
              </span>
            ) : null}
          </div>
        </div>
        <span className={`et-introductions-badge ${statusBadgeClass(request.status)}`}>
          {formatStatusLabel(request.status)}
        </span>
      </header>

      <p className="et-introductions-type">{request.request_type}</p>
      <p className="et-introductions-message">{request.message}</p>

      <ul className="et-introductions-timeline" aria-label="Introduction status">
        {timeline.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ul>

      <p className="et-introductions-date">Requested {formatRequestDate(request.created_at)}</p>

      <div className="et-introductions-actions">
        {onViewMemberProfile ? (
          <button
            type="button"
            className="et-btn et-btn--secondary et-btn--sm"
            onClick={() => onViewMemberProfile(counterpart.userId, counterpart.name)}
          >
            {introductionsCopy.viewProfile}
          </button>
        ) : null}

        {isIncomingPending ? (
          <>
            <button
              type="button"
              className="et-btn et-btn--forest et-btn--sm"
              onClick={() => onAccept(request.id)}
              disabled={isUpdating}
            >
              {isUpdating ? "Updating…" : introductionsCopy.accept}
            </button>
            <button
              type="button"
              className="et-btn et-btn--secondary et-btn--sm"
              onClick={() => onDecline(request.id)}
              disabled={isUpdating}
            >
              {introductionsCopy.decline}
            </button>
          </>
        ) : null}

        {isSentPending ? (
          <button
            type="button"
            className="et-btn et-btn--secondary et-btn--sm"
            onClick={() => onCancel(request.id)}
            disabled={isUpdating}
          >
            {isUpdating ? "Updating…" : introductionsCopy.cancelRequest}
          </button>
        ) : null}

        {canMessage ? (
          <button
            type="button"
            className="et-btn et-btn--forest et-btn--sm"
            onClick={() => onMessageMember(request)}
          >
            {introductionsCopy.messageMember}
          </button>
        ) : null}
      </div>
    </article>
  );
}
