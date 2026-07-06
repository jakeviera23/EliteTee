import { earlyStageCopy } from "../../data/portalSocial";
import { useComingSoon } from "./ComingSoonProvider";

type PortalMessagesProps = {
  unreadCount?: number;
};

export function PortalMessages({ unreadCount = 0 }: PortalMessagesProps) {
  const { showComingSoon } = useComingSoon();

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
          onClick={() => showComingSoon("New Conversation")}
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
            onClick={() => showComingSoon("New Conversation")}
          >
            New Conversation
          </button>
        </div>
      </div>
    </section>
  );
}
