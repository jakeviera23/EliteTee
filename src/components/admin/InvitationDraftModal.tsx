type InvitationDraftModalProps = {
  foundingMemberNumber: string;
  invitationEmailDraft: string;
  invitationLink: string;
  onClose: () => void;
};

export function InvitationDraftModal({
  foundingMemberNumber,
  invitationEmailDraft,
  invitationLink,
  onClose,
}: InvitationDraftModalProps) {
  async function copyDraft() {
    try {
      await navigator.clipboard.writeText(invitationEmailDraft);
    } catch {
      // Clipboard may be unavailable.
    }
  }

  return (
    <div className="portal-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="portal-modal portal-modal--invitation"
        role="dialog"
        aria-labelledby="invitation-draft-title"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="portal-modal-head">
          <h3 id="invitation-draft-title">Invitation Ready — {foundingMemberNumber}</h3>
          <button type="button" className="portal-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <p className="admin-invitation-note">
          Application approved. Copy the private invite link and email draft below before sending
          manually.
        </p>

        <p className="admin-invitation-link">
          <span>Invite link</span>
          <a href={invitationLink} target="_blank" rel="noreferrer">
            {invitationLink}
          </a>
        </p>

        <textarea
          className="admin-invitation-draft"
          readOnly
          rows={16}
          value={invitationEmailDraft}
          aria-label="Invitation email draft"
        />

        <div className="admin-invitation-actions">
          <button type="button" className="portal-btn portal-btn--outline" onClick={() => void copyDraft()}>
            Copy Invitation
          </button>
          <button type="button" className="portal-btn portal-btn--gold" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
