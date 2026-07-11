import { useCallback, useEffect, useState } from "react";
import type { AiAdminDashboard, AiSettingsUpdate } from "../../types/askEliteTee";
import { fetchAiAdminDashboard, updateAiSettings } from "../../lib/askEliteTee";

export function AiOperationsPanel() {
  const [dashboard, setDashboard] = useState<AiAdminDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    const { data, error } = await fetchAiAdminDashboard();
    setIsLoading(false);
    if (error) {
      setErrorMessage(error.message);
      setDashboard(null);
      return;
    }
    setDashboard(data);
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  async function handleToggle(field: keyof AiSettingsUpdate, value: boolean | number) {
    if (!dashboard) return;
    setIsSaving(true);
    setSuccessMessage(null);
    const { error } = await updateAiSettings({ [field]: value });
    setIsSaving(false);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setSuccessMessage("AI settings updated.");
    void loadDashboard();
  }

  if (isLoading) {
    return <p className="portal-empty">Loading AI operations…</p>;
  }

  if (errorMessage && !dashboard) {
    return (
      <p className="portal-alert portal-alert--error" role="alert">
        {errorMessage}
      </p>
    );
  }

  if (!dashboard) {
    return null;
  }

  const settings = dashboard.settings;
  const intentEntries = Object.entries(dashboard.intent_breakdown_7d ?? {});

  return (
    <section className="portal-admin-ai-ops" aria-labelledby="admin-ai-ops-heading">
      <header className="portal-section-head portal-section-head--compact">
        <h2 id="admin-ai-ops-heading">AI Operations</h2>
        <p>Usage, failures, and capability controls for Ask EliteTee.</p>
      </header>

      {successMessage ? (
        <p className="portal-alert portal-alert--success" role="status">
          {successMessage}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="portal-alert portal-alert--error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <div className="portal-admin-ai-controls">
        <label className="portal-admin-ai-toggle">
          <input
            type="checkbox"
            checked={settings.enabled}
            disabled={isSaving}
            onChange={(event) => void handleToggle("enabled", event.target.checked)}
          />
          <span>Ask EliteTee enabled</span>
        </label>
        <label className="portal-admin-ai-toggle">
          <input
            type="checkbox"
            checked={settings.enable_find_members}
            disabled={isSaving || !settings.enabled}
            onChange={(event) => void handleToggle("enable_find_members", event.target.checked)}
          />
          <span>Find members</span>
        </label>
        <label className="portal-admin-ai-toggle">
          <input
            type="checkbox"
            checked={settings.enable_find_courses}
            disabled={isSaving || !settings.enabled}
            onChange={(event) => void handleToggle("enable_find_courses", event.target.checked)}
          />
          <span>Find courses</span>
        </label>
        <label className="portal-admin-ai-toggle">
          <input
            type="checkbox"
            checked={settings.enable_recommend_introductions}
            disabled={isSaving || !settings.enabled}
            onChange={(event) =>
              void handleToggle("enable_recommend_introductions", event.target.checked)
            }
          />
          <span>Recommend introductions</span>
        </label>
      </div>

      <dl className="portal-admin-ai-stats">
        <div>
          <dt>Queries today</dt>
          <dd>{dashboard.queries_today}</dd>
        </div>
        <div>
          <dt>Queries (7d)</dt>
          <dd>{dashboard.queries_7d}</dd>
        </div>
        <div>
          <dt>Failures (7d)</dt>
          <dd>{dashboard.failures_7d}</dd>
        </div>
        <div>
          <dt>Feedback avg (7d)</dt>
          <dd>{dashboard.feedback_average_7d ?? "—"}</dd>
        </div>
        <div>
          <dt>Input tokens (7d)</dt>
          <dd>{dashboard.token_usage_7d.input_tokens}</dd>
        </div>
        <div>
          <dt>Output tokens (7d)</dt>
          <dd>{dashboard.token_usage_7d.output_tokens}</dd>
        </div>
        <div>
          <dt>Daily member limit</dt>
          <dd>{settings.daily_member_limit}</dd>
        </div>
      </dl>

      {intentEntries.length > 0 ? (
        <div className="portal-admin-ai-intents">
          <h3>Intent breakdown (7d)</h3>
          <ul>
            {intentEntries.map(([intent, count]) => (
              <li key={intent}>
                {intent}: {count}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {dashboard.recent_error_codes.length > 0 ? (
        <div className="portal-admin-ai-errors">
          <h3>Recent error codes</h3>
          <ul>
            {dashboard.recent_error_codes.map((entry) => (
              <li key={`${entry.error_code}-${entry.created_at}`}>
                {entry.error_code} — {new Date(entry.created_at).toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="portal-admin-ai-note">
        Live golf news and weather connectors are designed but disabled until licensed providers are
        configured. Meta Llama provider is deferred to Phase 2.
      </p>
    </section>
  );
}
