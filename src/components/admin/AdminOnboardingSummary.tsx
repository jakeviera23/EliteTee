import type { AdminOnboardingSnapshot } from "../../lib/adminOnboarding";

type AdminOnboardingSummaryProps = {
  snapshot: AdminOnboardingSnapshot;
  compact?: boolean;
};

function inviteBadgeClass(status: AdminOnboardingSnapshot["inviteStatus"]) {
  switch (status) {
    case "redeemed":
      return "et-admin-badge--forest";
    case "valid":
      return "et-admin-badge--gold";
    case "expired":
    case "missing":
      return "et-admin-badge--burgundy";
  }
}

function stepClass(state: AdminOnboardingSnapshot["steps"][number]["state"]) {
  switch (state) {
    case "complete":
      return "is-complete";
    case "current":
      return "is-current";
    case "unknown":
      return "is-unknown";
    default:
      return "is-incomplete";
  }
}

export function AdminOnboardingSummary({ snapshot, compact = false }: AdminOnboardingSummaryProps) {
  return (
    <div className={`et-admin-onboarding${compact ? " et-admin-onboarding--compact" : ""}`}>
      {snapshot.needsAttention ? (
        <p className="et-admin-onboarding-attention" role="status">
          <span className="et-admin-badge et-admin-badge--burgundy">Needs attention</span>
          <span className="et-admin-onboarding-attention-copy">{snapshot.attentionSummary}</span>
        </p>
      ) : null}

      <div className="et-admin-onboarding-steps" aria-label="Onboarding progression">
        {snapshot.steps.map((step) => (
          <span
            key={step.key}
            className={`et-admin-onboarding-step ${stepClass(step.state)}`}
            title={step.detail ? `${step.label}: ${step.detail}` : step.label}
          >
            <span className="et-admin-onboarding-step-label">{step.label}</span>
            {step.detail ? (
              <span className="et-admin-onboarding-step-detail">{step.detail}</span>
            ) : null}
          </span>
        ))}
      </div>

      <dl className="et-admin-onboarding-meta">
        <div>
          <dt>Invite</dt>
          <dd>
            <span className={`et-admin-badge ${inviteBadgeClass(snapshot.inviteStatus)}`}>
              {snapshot.steps.find((step) => step.key === "invite")?.detail ?? snapshot.inviteStatus}
            </span>
          </dd>
        </div>
        <div>
          <dt>Profile linked</dt>
          <dd>{snapshot.profileLinked ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt>Portal access</dt>
          <dd>{snapshot.portalAccessEnabled ? "Enabled" : "Disabled"}</dd>
        </div>
      </dl>
    </div>
  );
}
