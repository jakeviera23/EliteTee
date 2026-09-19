import {
  resolveMemberRelationshipCtaForPair,
  type MemberRelationshipContext,
} from "../../lib/memberRelationships";

type MemberRelationshipActionsProps = {
  otherUserId: string;
  context: MemberRelationshipContext | null;
  layout?: "hero" | "card";
  compactLabels?: boolean;
  onMessage?: () => void;
};

export function MemberRelationshipActions({
  otherUserId,
  context,
  layout = "card",
  compactLabels = false,
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

  const buttonClass =
    layout === "hero"
      ? `et-btn${cta.primary ? " et-btn--forest" : " et-btn--secondary"}`
      : `et-btn${cta.primary ? " et-btn--forest" : cta.disabled ? " et-btn--ghost" : " et-btn--secondary"}`;

  return (
    <button
      type="button"
      className={buttonClass}
      disabled={cta.disabled}
      aria-disabled={cta.disabled || undefined}
      onClick={() => onMessage?.()}
    >
      {cta.label}
    </button>
  );
}
