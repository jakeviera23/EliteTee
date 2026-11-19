import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CONTENT_REPORT_REASONS,
  formatContentReportError,
  submitContentReport,
  type ContentReportReason,
  type ContentReportTargetType,
} from "../../lib/contentReports";
import { createSubmissionLock } from "../../lib/reportSubmissionLock";

type ReportContentDialogProps = {
  open: boolean;
  targetType: ContentReportTargetType;
  targetId: string;
  targetLabel?: string;
  onClose: () => void;
  onSubmitted?: () => void;
};

/**
 * Must portal to document.body. Rendering inside feed cards (or any transformed
 * ancestor) breaks `position: fixed` and causes the dialog to jump/flash when
 * the parent hover transform toggles.
 */
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
  const submitLockRef = useRef(createSubmissionLock());
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    setReason("harassment");
    setDetails("");
    setError(null);
    setSuccess(false);
    setSubmitting(false);
    submitLockRef.current = createSubmissionLock();
  }, [open, targetId, targetType]);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add("et-safety-dialog-open");
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !submitLockRef.current.isInFlight) {
        onCloseRef.current();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.classList.remove("et-safety-dialog-open");
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  async function handleSubmitSafe(event: FormEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!targetId) return;

    setError(null);

    const outcome = await submitLockRef.current.run(async () => {
      setSubmitting(true);
      try {
        await submitContentReport({
          targetType,
          targetId,
          reason,
          details,
        });
        return { ok: true as const };
      } catch (err) {
        return { ok: false as const, err };
      } finally {
        setSubmitting(false);
      }
    });

    if (outcome.status === "ignored") {
      return;
    }

    if (outcome.result.ok) {
      setSuccess(true);
      onSubmitted?.();
      return;
    }

    setError(formatContentReportError(outcome.result.err));
  }

  function handleBackdropClick() {
    if (submitting || submitLockRef.current.isInFlight) return;
    onClose();
  }

  const dialog = (
    <div
      className="et-safety-dialog-backdrop"
      role="presentation"
      data-testid="report-content-dialog-backdrop"
      onClick={handleBackdropClick}
    >
      <div
        className="et-safety-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="report-content-dialog"
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
          <form onSubmit={(event) => void handleSubmitSafe(event)}>
            <h2 id={titleId}>Report {targetLabel}</h2>
            <p>
              Reports help keep EliteTee safe. Choose a reason and optionally add context for
              moderators.
            </p>

            <fieldset className="et-safety-fieldset" disabled={submitting}>
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
              disabled={submitting}
              onChange={(event) => setDetails(event.target.value)}
            />

            {error ? (
              <p className="et-safety-error" role="alert">
                {error}
              </p>
            ) : null}

            <div className="et-safety-dialog-actions">
              <button
                type="button"
                className="et-btn et-btn--secondary"
                onClick={onClose}
                disabled={submitting}
              >
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

  return createPortal(dialog, document.body);
}
