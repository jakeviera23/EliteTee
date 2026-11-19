import { useCallback, useEffect, useMemo, useState } from "react";
import {
  acknowledgeSafetyAlert,
  fetchAdminContentReports,
  fetchAdminSafetyAlerts,
  fetchModerationAuditEvents,
  fetchRecentMemberBlocks,
  hideReportedContent,
  hoursOpen,
  isReportApproachingDeadline,
  isReportPastDeadline,
  setMemberPortalAccess,
  updateAdminContentReport,
  type AdminMemberBlockRow,
  type AdminSafetyAlert,
  type ModerationAuditEvent,
} from "../../lib/adminModeration";
import type { ContentReportRecord } from "../../lib/contentReports";

function formatWhen(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function AdminModerationPanel() {
  const [reports, setReports] = useState<ContentReportRecord[]>([]);
  const [alerts, setAlerts] = useState<AdminSafetyAlert[]>([]);
  const [blocks, setBlocks] = useState<AdminMemberBlockRow[]>([]);
  const [audit, setAudit] = useState<ModerationAuditEvent[]>([]);
  const [statusFilter, setStatusFilter] = useState<"open" | "all" | "resolved" | "dismissed">(
    "open",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reportRows, alertRows, blockRows, auditRows] = await Promise.all([
        fetchAdminContentReports(statusFilter === "all" ? null : statusFilter),
        fetchAdminSafetyAlerts(),
        fetchRecentMemberBlocks(),
        fetchModerationAuditEvents(),
      ]);
      setReports(reportRows);
      setAlerts(alertRows);
      setBlocks(blockRows);
      setAudit(auditRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Moderation data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const openUrgentCount = useMemo(
    () =>
      reports.filter(
        (report) =>
          (report.status === "open" || report.status === "reviewing") &&
          (isReportApproachingDeadline(report.created_at) ||
            isReportPastDeadline(report.created_at)),
      ).length,
    [reports],
  );

  async function runAction(id: string, work: () => Promise<void>, success: string) {
    setBusyId(id);
    setActionMessage(null);
    setError(null);
    try {
      await work();
      setActionMessage(success);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="et-admin-moderation" aria-labelledby="admin-moderation-heading">
      <header className="et-admin-panel-header">
        <div>
          <h2 id="admin-moderation-heading">Moderation</h2>
          <p>
            Review member reports and blocks. Aim to act on open reports promptly; markers flag
            items approaching or past 24 hours so operators can prioritize.
          </p>
        </div>
        <button type="button" className="et-btn et-btn--secondary" onClick={() => void load()}>
          Refresh
        </button>
      </header>

      {loading ? <p>Loading moderation queue…</p> : null}
      {error ? (
        <p className="et-safety-error" role="alert">
          {error}
        </p>
      ) : null}
      {actionMessage ? (
        <p className="et-admin-success" role="status">
          {actionMessage}
        </p>
      ) : null}

      <div className="et-admin-moderation-metrics">
        <p>
          Open / reviewing with 18h+ age: <strong>{openUrgentCount}</strong>
        </p>
        <p>
          Unacknowledged alerts:{" "}
          <strong>{alerts.filter((alert) => !alert.acknowledged_at).length}</strong>
        </p>
      </div>

      <div className="et-admin-moderation-filters" role="group" aria-label="Report status filter">
        {(["open", "all", "resolved", "dismissed"] as const).map((value) => (
          <button
            key={value}
            type="button"
            className={`et-btn et-btn--sm${statusFilter === value ? " et-btn--forest" : " et-btn--secondary"}`}
            onClick={() => setStatusFilter(value)}
          >
            {value}
          </button>
        ))}
      </div>

      <section aria-labelledby="reports-inbox-heading">
        <h3 id="reports-inbox-heading">Reports inbox</h3>
        {reports.length === 0 && !loading ? <p>No reports for this filter.</p> : null}
        <ul className="et-admin-report-list">
          {reports.map((report) => {
            const ageHours = hoursOpen(report.created_at);
            const urgent =
              (report.status === "open" || report.status === "reviewing") &&
              (isReportApproachingDeadline(report.created_at) ||
                isReportPastDeadline(report.created_at));
            return (
              <li
                key={report.id}
                className={`et-admin-report-item${urgent ? " is-urgent" : ""}`}
              >
                <div>
                  <p>
                    <strong>{report.target_type}</strong> · {report.reason} · {report.status}
                  </p>
                  <p>
                    Submitted {formatWhen(report.created_at)} ({ageHours.toFixed(1)}h)
                    {isReportPastDeadline(report.created_at) ? " · past 24h" : null}
                    {isReportApproachingDeadline(report.created_at) ? " · approaching 24h" : null}
                  </p>
                  <p>
                    Target id: <code>{report.target_id}</code>
                    {report.target_user_id ? (
                      <>
                        {" "}
                        · Member: <code>{report.target_user_id}</code>
                      </>
                    ) : null}
                  </p>
                  {report.details ? <p>{report.details}</p> : null}
                </div>
                <div className="et-admin-report-actions">
                  <button
                    type="button"
                    className="et-btn et-btn--secondary et-btn--sm"
                    disabled={busyId === report.id}
                    onClick={() =>
                      void runAction(
                        report.id,
                        () =>
                          updateAdminContentReport({
                            reportId: report.id,
                            status: "reviewing",
                          }).then(() => undefined),
                        "Marked reviewing",
                      )
                    }
                  >
                    Reviewing
                  </button>
                  {report.target_type !== "member_profile" ? (
                    <button
                      type="button"
                      className="et-btn et-btn--secondary et-btn--sm"
                      disabled={busyId === report.id}
                      onClick={() =>
                        void runAction(
                          report.id,
                          async () => {
                            await hideReportedContent({
                              targetType: report.target_type,
                              targetId: report.target_id,
                              reason: "Hidden after member report",
                              reportId: report.id,
                            });
                            await updateAdminContentReport({
                              reportId: report.id,
                              status: "resolved",
                              resolutionNotes: "Content hidden",
                            });
                          },
                          "Content hidden and report resolved",
                        )
                      }
                    >
                      Hide content
                    </button>
                  ) : null}
                  {report.target_user_id ? (
                    <button
                      type="button"
                      className="et-btn et-btn--secondary et-btn--sm"
                      disabled={busyId === report.id}
                      onClick={() =>
                        void runAction(
                          report.id,
                          async () => {
                            await setMemberPortalAccess({
                              userId: report.target_user_id!,
                              enabled: false,
                              reason: "Suspended after member report",
                              reportId: report.id,
                            });
                            await updateAdminContentReport({
                              reportId: report.id,
                              status: "resolved",
                              resolutionNotes: "Member portal access suspended",
                            });
                          },
                          "Member suspended and report resolved",
                        )
                      }
                    >
                      Suspend member
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="et-btn et-btn--forest et-btn--sm"
                    disabled={busyId === report.id}
                    onClick={() =>
                      void runAction(
                        report.id,
                        () =>
                          updateAdminContentReport({
                            reportId: report.id,
                            status: "resolved",
                            resolutionNotes: "Resolved without content action",
                          }).then(() => undefined),
                        "Report resolved",
                      )
                    }
                  >
                    Resolve
                  </button>
                  <button
                    type="button"
                    className="et-btn et-btn--secondary et-btn--sm"
                    disabled={busyId === report.id}
                    onClick={() =>
                      void runAction(
                        report.id,
                        () =>
                          updateAdminContentReport({
                            reportId: report.id,
                            status: "dismissed",
                            resolutionNotes: "Dismissed",
                          }).then(() => undefined),
                        "Report dismissed",
                      )
                    }
                  >
                    Dismiss
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="alerts-heading">
        <h3 id="alerts-heading">Safety alerts</h3>
        <ul className="et-admin-report-list">
          {alerts.slice(0, 30).map((alert) => (
            <li key={alert.id} className="et-admin-report-item">
              <div>
                <p>
                  <strong>{alert.alert_type}</strong> · {alert.summary}
                </p>
                <p>
                  {formatWhen(alert.created_at)}
                  {alert.email_notified_at
                    ? ` · emailed ${formatWhen(alert.email_notified_at)}`
                    : " · email pending / not configured"}
                  {alert.acknowledged_at ? ` · acknowledged ${formatWhen(alert.acknowledged_at)}` : ""}
                </p>
              </div>
              {!alert.acknowledged_at ? (
                <button
                  type="button"
                  className="et-btn et-btn--secondary et-btn--sm"
                  disabled={busyId === alert.id}
                  onClick={() =>
                    void runAction(
                      alert.id,
                      () => acknowledgeSafetyAlert(alert.id),
                      "Alert acknowledged",
                    )
                  }
                >
                  Acknowledge
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="blocks-heading">
        <h3 id="blocks-heading">Recent member blocks</h3>
        <ul className="et-admin-report-list">
          {blocks.map((block) => (
            <li key={block.id} className="et-admin-report-item">
              <p>
                {block.blocker_name || block.blocker_user_id} blocked{" "}
                {block.blocked_name || block.blocked_user_id}
              </p>
              <p>{formatWhen(block.created_at)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="audit-heading">
        <h3 id="audit-heading">Moderation audit trail</h3>
        <ul className="et-admin-report-list">
          {audit.slice(0, 40).map((event) => (
            <li key={event.id} className="et-admin-report-item">
              <p>
                <strong>{event.action}</strong> · {event.target_type}
                {event.target_id ? (
                  <>
                    {" "}
                    · <code>{event.target_id}</code>
                  </>
                ) : null}
              </p>
              <p>
                {formatWhen(event.created_at)}
                {event.notes ? ` · ${event.notes}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
