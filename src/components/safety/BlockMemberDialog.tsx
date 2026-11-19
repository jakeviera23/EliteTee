import { useId, useState } from "react";
import { blockMember, formatMemberBlockError } from "../../lib/memberBlocks";

type BlockMemberDialogProps = {
  open: boolean;
  memberUserId: string;
  memberName?: string;
  onClose: () => void;
  onBlocked?: () => void;
};

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

  if (!open) return null;

  async function handleBlock() {
    setSubmitting(true);
    setError(null);
    try {
      await blockMember(memberUserId);
      onBlocked?.();
      onClose();
    } catch (err) {
      setError(formatMemberBlockError(err));
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
          <button type="button" className="et-btn et-btn--secondary" onClick={onClose}>
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
}
