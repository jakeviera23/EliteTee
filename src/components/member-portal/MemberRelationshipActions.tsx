import {
  findPendingIntroductionRequestForPair,
  resolveMemberRelationshipCtaForPair,
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

  const cta = resolveMemberRelationshipCtaForPair(
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

  const buttonClass =
    layout === "hero"
      ? `et-btn${cta.primary ? " et-btn--forest" : " et-btn--secondary"}`
      : `et-btn${cta.primary ? " et-btn--forest" : cta.disabled ? " et-btn--ghost" : " et-btn--secondary"}`;

  function handleClick() {
    switch (cta.action) {
      case "request_introduction":
        onRequestIntroduction?.();
        break;
      case "respond_to_request":
        if (pendingRequest) {
          onRespondToRequest?.(pendingRequest.id);
        }
        break;
      case "message":
        onMessage?.();
        break;
      default:
        break;
    }
  }

  return (
    <button
      type="button"
      className={buttonClass}
      disabled={cta.disabled}
      aria-disabled={cta.disabled || undefined}
      onClick={handleClick}
    >
      {cta.label}
    </button>
  );
}
