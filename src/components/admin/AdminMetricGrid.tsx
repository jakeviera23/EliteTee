import { adminCopy } from "../../data/adminCopy";
import type { AdminOverviewMetrics } from "../../lib/adminDashboard";

type AdminMetricGridProps = {
  metrics: AdminOverviewMetrics;
  isLoading: boolean;
};

type MetricCard = {
  key: string;
  label: string;
  value: string;
  tone?: "default" | "gold" | "forest" | "burgundy" | "muted";
  hint?: string;
};

function formatMetricValue(value: number | null, isLoading: boolean) {
  if (isLoading) return "…";
  if (value === null) return adminCopy.overview.unavailable;
  return String(value);
}

export function AdminMetricGrid({ metrics, isLoading }: AdminMetricGridProps) {
  const cards: MetricCard[] = [
    {
      key: "pending",
      label: adminCopy.overview.pendingApplications,
      value: formatMetricValue(metrics.pendingApplications, isLoading),
      tone: metrics.pendingApplications > 0 ? "gold" : "default",
    },
    {
      key: "approved",
      label: adminCopy.overview.approvedMembers,
      value: formatMetricValue(metrics.approvedMembers, isLoading),
      tone: "forest",
    },
    {
      key: "profiles",
      label: adminCopy.overview.profilesCreated,
      value: formatMetricValue(metrics.profilesCreated, isLoading),
    },
    {
      key: "portal",
      label: adminCopy.overview.portalActive,
      value: formatMetricValue(metrics.portalActiveMembers, isLoading),
      tone: metrics.portalActiveMembers === null ? "muted" : "forest",
      hint: metrics.portalActiveMembers === null ? adminCopy.overview.unavailableHint : undefined,
    },
    {
      key: "invites-awaiting",
      label: adminCopy.overview.invitesAwaiting,
      value: formatMetricValue(metrics.invitesAwaiting, isLoading),
      tone: metrics.invitesAwaiting > 0 ? "gold" : "default",
    },
    {
      key: "invites-redeemed",
      label: adminCopy.overview.invitesRedeemed,
      value: formatMetricValue(metrics.invitesRedeemed, isLoading),
    },
    {
      key: "ask-today",
      label: adminCopy.overview.askQueriesToday,
      value: formatMetricValue(metrics.askQueriesToday, isLoading),
      tone: metrics.askQueriesToday === null ? "muted" : "default",
      hint: metrics.askQueriesToday === null ? adminCopy.overview.unavailableHint : undefined,
    },
    {
      key: "ask-7d",
      label: adminCopy.overview.askQueries7d,
      value: formatMetricValue(metrics.askQueries7d, isLoading),
      tone: metrics.askQueries7d === null ? "muted" : "default",
    },
    {
      key: "ai-failures",
      label: adminCopy.overview.aiFailures7d,
      value: formatMetricValue(metrics.aiFailures7d, isLoading),
      tone:
        metrics.aiFailures7d === null
          ? "muted"
          : metrics.aiFailures7d > 0
            ? "burgundy"
            : "default",
      hint: metrics.aiFailures7d === null ? adminCopy.overview.unavailableHint : undefined,
    },
  ];

  return (
    <section className="et-admin-metrics" aria-label="Founder overview metrics">
      <div className="et-admin-metrics-grid">
        {cards.map((card) => (
          <article
            key={card.key}
            className={`et-admin-metric${card.tone ? ` et-admin-metric--${card.tone}` : ""}`}
          >
            <p className="et-admin-metric-label">{card.label}</p>
            <p className="et-admin-metric-value">{card.value}</p>
            {card.hint ? <p className="et-admin-metric-hint">{card.hint}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
