import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { blockMember, formatMemberBlockError } from "../../lib/memberBlocks";
import { createSubmissionLock } from "../../lib/reportSubmissionLock";

type BlockMemberDialogProps = {
  open: boolean;
  memberUserId: string;
  memberName?: string;
  onClose: () => void;
  onBlocked?: () => void;
};

/** Portaled to document.body so feed-card transforms cannot destabilize the overlay. */
export function BlockMemberDialog({
  open,
  memberUserId,
  memberName = "this member",
  onClose,
  onBlocked,
}: BlockMemberDialogProps) {
  const titleId = useId();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitLockRef = useRef(createSubmissionLock());
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSubmitting(false);
    submitLockRef.current = createSubmissionLock();
  }, [open, memberUserId]);

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

  async function handleBlock() {
    if (!memberUserId) return;

    const outcome = await submitLockRef.current.run(async () => {
      setSubmitting(true);
      setError(null);
      try {
        await blockMember(memberUserId);
        return { ok: true as const };
      } catch (err) {
        return { ok: false as const, err };
      } finally {
        setSubmitting(false);
      }
    });

    if (outcome.status === "ignored") return;

    if (outcome.result.ok) {
      onBlocked?.();
      onClose();
      return;
    }

    setError(formatMemberBlockError(outcome.result.err));
  }

  function handleBackdropClick() {
    if (submitting || submitLockRef.current.isInFlight) return;
    onClose();
  }

  const dialog = (
    <div
      className="et-safety-dialog-backdrop"
      role="presentation"
      onClick={handleBackdropClick}
    >
      <div
        className="et-safety-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId}>Block {memberName}?</h2>
        <p>
          Their posts, comments, and profile will be hidden from you. Direct messaging will be
          blocked in both directions. You can unblock them later from Blocked Members.
        </p>
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
            type="button"
            className="et-btn et-btn--danger"
            disabled={submitting}
            onClick={() => void handleBlock()}
          >
            {submitting ? "Blocking…" : "Block member"}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
