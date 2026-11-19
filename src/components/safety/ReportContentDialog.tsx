import { FormEvent, useId, useState } from "react";
import {
  CONTENT_REPORT_REASONS,
  formatContentReportError,
  submitContentReport,
  type ContentReportReason,
  type ContentReportTargetType,
} from "../../lib/contentReports";

type ReportContentDialogProps = {
  open: boolean;
  targetType: ContentReportTargetType;
  targetId: string;
  targetLabel?: string;
  onClose: () => void;
  onSubmitted?: () => void;
};

export function ReportContentDialog({
  open,
  targetType,
  targetId,
  targetLabel = "this content",
  onClose,
  onSubmitted,
}: ReportContentDialogProps) {
  const titleId = useId();
  const [reason, setReason] = useState<ContentReportReason>("harassment");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await submitContentReport({
        targetType,
        targetId,
        reason,
        details,
      });
      setSuccess(true);
      onSubmitted?.();
    } catch (err) {
      setError(formatContentReportError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="et-safety-dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="et-safety-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        {success ? (
          <>
            <h2 id={titleId}>Report submitted</h2>
            <p>
              Thank you. EliteTee administrators have been notified and will review this report.
              We aim to review reports promptly; response timing depends on operator availability.
            </p>
            <div className="et-safety-dialog-actions">
              <button type="button" className="et-btn et-btn--forest" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 id={titleId}>Report {targetLabel}</h2>
            <p>
              Reports help keep EliteTee safe. Choose a reason and optionally add context for
              moderators.
            </p>

            <fieldset className="et-safety-fieldset">
              <legend>Reason</legend>
              {CONTENT_REPORT_REASONS.map((option) => (
                <label key={option.value} className="et-safety-radio">
                  <input
                    type="radio"
                    name="report-reason"
                    value={option.value}
                    checked={reason === option.value}
                    onChange={() => setReason(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </fieldset>

            <label className="et-safety-label" htmlFor="report-details">
              Additional details (optional)
            </label>
            <textarea
              id="report-details"
              className="et-safety-textarea"
              value={details}
              maxLength={2000}
              rows={4}
              onChange={(event) => setDetails(event.target.value)}
            />

            {error ? (
              <p className="et-safety-error" role="alert">
                {error}
              </p>
            ) : null}

            <div className="et-safety-dialog-actions">
              <button type="button" className="et-btn et-btn--secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="et-btn et-btn--forest"
                disabled={submitting || !targetId}
              >
                {submitting ? "Submitting…" : "Submit report"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
