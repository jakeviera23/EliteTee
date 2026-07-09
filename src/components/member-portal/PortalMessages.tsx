import { useState } from "react";
import { earlyStageCopy } from "../../data/portalSocial";

type PortalMessagesProps = {
  unreadCount?: number;
};

export function PortalMessages({ unreadCount: _unreadCount = 0 }: PortalMessagesProps) {
  const [showNewModal, setShowNewModal] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");

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
        <div
          className="portal-modal-backdrop"
          role="presentation"
          onClick={() => setShowNewModal(false)}
        >
          <div
            className="portal-modal messages-modal"
            role="dialog"
            aria-labelledby="new-conversation-title"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="portal-modal-head">
              <h3 id="new-conversation-title">New Conversation</h3>
              <button
                type="button"
                className="portal-modal-close"
                onClick={() => setShowNewModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </header>

            <label className="messages-modal-search">
              <span className="visually-hidden">Search members</span>
              <input
                type="search"
                value={memberSearch}
                onChange={(event) => setMemberSearch(event.target.value)}
                placeholder="Search members…"
                disabled
              />
            </label>

            <div className="portal-empty portal-empty--social">
              <p>{earlyStageCopy.messagesNewEmpty}</p>
            </div>

            <footer className="messages-modal-footer">
              <button
                type="button"
                className="portal-btn portal-btn--outline"
                onClick={() => setShowNewModal(false)}
              >
                Close
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </section>
  );
}
