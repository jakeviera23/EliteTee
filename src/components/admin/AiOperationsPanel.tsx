import { useState } from "react";
import { adminCopy } from "../../data/adminCopy";
import type { AiAdminDashboard, AiSettingsUpdate } from "../../types/askEliteTee";
import { updateAiSettings } from "../../lib/askEliteTee";

type AiOperationsPanelProps = {
  dashboard: AiAdminDashboard | null;
  isLoading: boolean;
  errorMessage: string | null;
  onRefresh: () => void;
};

export function AiOperationsPanel({
  dashboard,
  isLoading,
  errorMessage,
  onRefresh,
}: AiOperationsPanelProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  async function handleToggle(field: keyof AiSettingsUpdate, value: boolean | number) {
    if (!dashboard) return;
    setIsSaving(true);
    setSuccessMessage(null);
    setToggleError(null);
    const { error } = await updateAiSettings({ [field]: value });
    setIsSaving(false);
    if (error) {
      console.error("[AiOperationsPanel]", error);
      setToggleError("AI settings could not be updated. Please try again.");
      return;
    }
    setSuccessMessage(adminCopy.ai.settingsUpdated);
    onRefresh();
  }

  if (isLoading) {
    return <p className="et-admin-empty">{adminCopy.ai.loading}</p>;
  }

  if (errorMessage && !dashboard) {
    return (
      <div className="et-admin-alert et-admin-alert--error" role="alert">
        <p>{adminCopy.ai.loadError}</p>
        <button type="button" className="et-btn et-btn--secondary" onClick={onRefresh}>
          {adminCopy.actions.retry}
        </button>
      </div>
    );
  }

  if (!dashboard) {
    return null;
  }

  const settings = dashboard.settings;
  const intentEntries = Object.entries(dashboard.intent_breakdown_7d ?? {});

  return (
    <section className="et-admin-ai" aria-labelledby="admin-ai-ops-heading">
      <header className="et-admin-section-head">
        <h2 id="admin-ai-ops-heading">{adminCopy.ai.title}</h2>
        <p>{adminCopy.ai.lead}</p>
      </header>

      {successMessage ? (
        <p className="et-admin-alert et-admin-alert--success" role="status">
          {successMessage}
        </p>
      ) : null}

      {toggleError ? (
        <p className="et-admin-alert et-admin-alert--error" role="alert">
          {toggleError}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="et-admin-alert et-admin-alert--warning" role="status">
          {errorMessage}
        </p>
      ) : null}

      <div className="et-admin-ai-controls">
        <label className="et-admin-toggle">
          <input
            type="checkbox"
            checked={settings.enabled}
            disabled={isSaving}
            onChange={(event) => void handleToggle("enabled", event.target.checked)}
          />
          <span>{adminCopy.ai.enabled}</span>
        </label>
        <label className="et-admin-toggle">
          <input
            type="checkbox"
            checked={settings.enable_find_members}
            disabled={isSaving || !settings.enabled}
            onChange={(event) => void handleToggle("enable_find_members", event.target.checked)}
          />
          <span>{adminCopy.ai.findMembers}</span>
        </label>
        <label className="et-admin-toggle">
          <input
            type="checkbox"
            checked={settings.enable_find_courses}
            disabled={isSaving || !settings.enabled}
            onChange={(event) => void handleToggle("enable_find_courses", event.target.checked)}
          />
          <span>{adminCopy.ai.findCourses}</span>
        </label>
        <label className="et-admin-toggle">
          <input
            type="checkbox"
            checked={settings.enable_recommend_introductions}
            disabled={isSaving || !settings.enabled}
            onChange={(event) =>
              void handleToggle("enable_recommend_introductions", event.target.checked)
            }
          />
          <span>{adminCopy.ai.recommendIntros}</span>
        </label>
      </div>

      <div className="et-admin-metrics-grid et-admin-metrics-grid--compact">
        <article className="et-admin-metric">
          <p className="et-admin-metric-label">{adminCopy.ai.queriesToday}</p>
          <p className="et-admin-metric-value">{dashboard.queries_today}</p>
        </article>
        <article className="et-admin-metric">
          <p className="et-admin-metric-label">{adminCopy.ai.queries7d}</p>
          <p className="et-admin-metric-value">{dashboard.queries_7d}</p>
        </article>
        <article className="et-admin-metric et-admin-metric--burgundy">
          <p className="et-admin-metric-label">{adminCopy.ai.failures7d}</p>
          <p className="et-admin-metric-value">{dashboard.failures_7d}</p>
        </article>
        <article className="et-admin-metric et-admin-metric--gold">
          <p className="et-admin-metric-label">{adminCopy.ai.feedbackAvg}</p>
          <p className="et-admin-metric-value">{dashboard.feedback_average_7d ?? "—"}</p>
        </article>
        <article className="et-admin-metric">
          <p className="et-admin-metric-label">{adminCopy.ai.feedbackCount}</p>
          <p className="et-admin-metric-value">{dashboard.feedback_count_7d}</p>
        </article>
        <article className="et-admin-metric">
          <p className="et-admin-metric-label">{adminCopy.ai.inputTokens}</p>
          <p className="et-admin-metric-value">{dashboard.token_usage_7d.input_tokens}</p>
        </article>
        <article className="et-admin-metric">
          <p className="et-admin-metric-label">{adminCopy.ai.outputTokens}</p>
          <p className="et-admin-metric-value">{dashboard.token_usage_7d.output_tokens}</p>
        </article>
        <article className="et-admin-metric">
          <p className="et-admin-metric-label">{adminCopy.ai.dailyLimit}</p>
          <p className="et-admin-metric-value">{settings.daily_member_limit}</p>
        </article>
      </div>

      <section className="et-admin-subsection" aria-labelledby="admin-ai-intents-heading">
        <h3 id="admin-ai-intents-heading">{adminCopy.ai.intentTitle}</h3>
        {intentEntries.length > 0 ? (
          <ul className="et-admin-ai-list">
            {intentEntries.map(([intent, count]) => (
              <li key={intent}>
                <span>{intent}</span>
                <strong>{count}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="et-admin-empty-inline">{adminCopy.ai.noIntents}</p>
        )}
      </section>

      <section className="et-admin-subsection" aria-labelledby="admin-ai-errors-heading">
        <h3 id="admin-ai-errors-heading">{adminCopy.ai.errorsTitle}</h3>
        {dashboard.recent_error_codes.length > 0 ? (
          <ul className="et-admin-ai-list">
            {dashboard.recent_error_codes.map((entry) => (
              <li key={`${entry.error_code}-${entry.created_at}`}>
                <span>{entry.error_code}</span>
                <strong>{new Date(entry.created_at).toLocaleString()}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="et-admin-empty-inline">{adminCopy.ai.noErrors}</p>
        )}
      </section>

      <p className="et-admin-note">{adminCopy.ai.note}</p>
    </section>
  );
}
