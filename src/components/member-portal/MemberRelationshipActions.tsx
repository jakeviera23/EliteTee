import {
  canDirectMessageMember,
  findPendingIntroductionRequestForPair,
  resolveMemberIntroductionCtaForPair,
  type MemberRelationshipContext,
} from "../../lib/memberRelationships";

type MemberRelationshipActionsProps = {
  otherUserId: string;
  context: MemberRelationshipContext | null;
  layout?: "hero" | "card";
  compactLabels?: boolean;
  onRequestIntroduction?: () => void;
  onRespondToRequest?: (requestId: string) => void;
  onMessage?: () => void;
};

export function MemberRelationshipActions({
  otherUserId,
  context,
  layout = "card",
  compactLabels = false,
  onRequestIntroduction,
  onRespondToRequest,
  onMessage,
}: MemberRelationshipActionsProps) {
  if (!context?.currentUserId || !otherUserId || otherUserId === context.currentUserId) {
    return null;
  }

  const introduction = resolveMemberIntroductionCtaForPair(
    context.currentUserId,
    otherUserId,
    context,
    { compact: compactLabels },
  );
  const pendingRequest = findPendingIntroductionRequestForPair(
    context.currentUserId,
    otherUserId,
    context.introductionRequests,
  );
  const showMessage = Boolean(onMessage) && canDirectMessageMember(context.currentUserId, otherUserId);
  const introductionInteractive =
    (introduction.action === "request_introduction" && Boolean(onRequestIntroduction)) ||
    (introduction.action === "respond_to_request" && Boolean(onRespondToRequest && pendingRequest));

  function handleIntroductionClick() {
    if (introduction.action === "request_introduction") {
      onRequestIntroduction?.();
    } else if (introduction.action === "respond_to_request" && pendingRequest) {
      onRespondToRequest?.(pendingRequest.id);
    }
  }

  return (
    <>
      {showMessage ? (
        <button type="button" className="et-btn et-btn--forest" onClick={onMessage}>
          Message
        </button>
      ) : null}
      {introductionInteractive ? (
        <button
          type="button"
          className={`et-btn et-btn--secondary et-relationship-intro-btn et-relationship-intro-btn--${introduction.action}`}
          onClick={handleIntroductionClick}
        >
          {introduction.label}
        </button>
      ) : introduction.disabled ? (
        <span
          className={`et-relationship-status et-relationship-status--${introduction.action}${
            layout === "hero" ? " et-relationship-status--hero" : ""
          }`}
          role="status"
        >
          <span className="et-relationship-status-dot" aria-hidden="true" />
          {introduction.label}
        </span>
      ) : null}
    </>
  );
}
