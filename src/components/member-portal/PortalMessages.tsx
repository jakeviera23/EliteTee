import { useState } from "react";
import { earlyStageCopy } from "../../data/portalSocial";
import { NewConversationModal } from "./NewConversationModal";
import { usePortalToast } from "./PortalToastProvider";

type PortalMessagesProps = {
  unreadCount?: number;
};

export function PortalMessages({ unreadCount = 0 }: PortalMessagesProps) {
  const { showToast } = usePortalToast();
  const [showNewConversation, setShowNewConversation] = useState(false);

  function handleStartConversation(_golferId: string, _golferName: string, _message: string) {
    showToast("Message saved locally — messaging opens as members join.");
  }

  return (
    <section className="portal-social-page portal-messages-page" aria-labelledby="messages-heading">
      <header className="portal-section-head portal-section-head--social portal-messages-head portal-section-head--compact">
        <div>
          <h2 id="messages-heading">Messages</h2>
          <p>Connect through golf with members you follow.</p>
          <p className="portal-early-badge">{earlyStageCopy.earlyCommunity}</p>
        </div>
        <button
          type="button"
          className="portal-btn portal-btn--gold portal-btn--compact"
          onClick={() => setShowNewConversation(true)}
        >
          New Conversation
        </button>
      </header>

      {unreadCount > 0 ? (
        <p className="portal-messages-unread" role="status">
          {unreadCount} unread message{unreadCount === 1 ? "" : "s"}
        </p>
      ) : null}

      <div className="portal-messages-layout portal-messages-layout--empty">
        <div className="portal-empty portal-empty--social portal-empty--panel">
          <h3>{earlyStageCopy.earlyCommunity}</h3>
          <p>{earlyStageCopy.messagesEmpty}</p>
          <button
            type="button"
            className="portal-btn portal-btn--outline"
            onClick={() => setShowNewConversation(true)}
          >
            New Conversation
          </button>
        </div>
      </div>

      {showNewConversation ? (
        <NewConversationModal
          onClose={() => setShowNewConversation(false)}
          onStart={handleStartConversation}
        />
      ) : null}
    </section>
  );
}
