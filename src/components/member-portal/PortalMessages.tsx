import { useState } from "react";
import { earlyStageCopy } from "../../data/portalSocial";
import { NewConversationModal } from "./NewConversationModal";

type PortalMessagesProps = {
  unreadCount?: number;
};

export function PortalMessages({ unreadCount: _unreadCount = 0 }: PortalMessagesProps) {
  const [showNewModal, setShowNewModal] = useState(false);

  function handleStartConversation(receiverUserId: string, memberName: string) {
    console.info("[PortalMessages] selected message recipient", {
      receiverUserId,
      memberName,
    });
    setShowNewModal(false);
  }

  return (
    <section className="portal-social-page portal-messages-page" aria-labelledby="messages-heading">
      <header className="portal-section-head portal-section-head--social portal-messages-head portal-section-head--compact">
        <div>
          <h2 id="messages-heading">Messages</h2>
          <p>Connect through golf with founding members as the community grows.</p>
        </div>
        <button
          type="button"
          className="portal-btn portal-btn--gold portal-btn--compact"
          onClick={() => setShowNewModal(true)}
        >
          New Conversation
        </button>
      </header>

      <div className="portal-messages-empty">
        <p className="portal-messages-empty-title">{earlyStageCopy.messagesEmptyTitle}</p>
        <p className="portal-messages-empty-body">{earlyStageCopy.messagesEmptyBody}</p>
        <p className="portal-messages-empty-note">{earlyStageCopy.messagesEmptyNote}</p>
      </div>

      {showNewModal ? (
        <NewConversationModal
          onClose={() => setShowNewModal(false)}
          onStart={handleStartConversation}
        />
      ) : null}
    </section>
  );
}
