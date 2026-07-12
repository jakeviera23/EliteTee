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
    <div className="et-admin-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="et-admin-modal"
        role="dialog"
        aria-labelledby="invitation-draft-title"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="et-admin-modal-head">
          <h3 id="invitation-draft-title">Invitation ready — {foundingMemberNumber}</h3>
          <button type="button" className="et-admin-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <p className="et-admin-invitation-note">
          Application approved. Copy the private invite link and email draft below before sending
          manually.
        </p>

        <p className="et-admin-invitation-link">
          <span>Invite link</span>
          <a href={invitationLink} target="_blank" rel="noreferrer">
            {invitationLink}
          </a>
        </p>

        <textarea
          className="et-admin-invitation-draft"
          readOnly
          rows={16}
          value={invitationEmailDraft}
          aria-label="Invitation email draft"
        />

        <div className="et-admin-invitation-actions">
          <button type="button" className="et-btn et-btn--secondary" onClick={() => void copyDraft()}>
            Copy invitation
          </button>
          <button type="button" className="et-btn et-btn--forest" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
