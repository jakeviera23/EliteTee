import { earlyStageCopy } from "../../data/portalSocial";

type NewConversationModalProps = {
  onClose: () => void;
  onStart: (golferId: string, golferName: string, message: string) => void;
};

export function NewConversationModal({ onClose }: NewConversationModalProps) {
  return (
    <div className="portal-modal-backdrop" role="presentation" onClick={onClose}>
      <article
        className="portal-modal portal-modal--conversation"
        role="dialog"
        aria-labelledby="new-conversation-heading"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="portal-modal-head">
          <h2 id="new-conversation-heading">New Conversation</h2>
          <button type="button" className="portal-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="portal-empty portal-empty--social">
          <p>{earlyStageCopy.discoverGolfersEmpty}</p>
          <p className="portal-empty-note">{earlyStageCopy.messagesEmpty}</p>
        </div>
      </article>
    </div>
  );
}
