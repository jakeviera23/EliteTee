import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { earlyStageCopy } from "../../data/portalSocial";
import { fetchMessageablePortalMembers } from "../../lib/memberProfiles";
import {
  buildDirectConversationSummaries,
  fetchDirectMessageThread,
  fetchDirectPrivateMessages,
  markDirectMessagesAsRead,
  sendDirectPrivateMessage,
} from "../../lib/privateMessages";
import type { DirectConversationSummary, PrivateMessageRecord } from "../../types/privateMessage";
import { getCurrentAuthUserId } from "../../lib/authUserLinking";
import { NewConversationModal } from "./NewConversationModal";

type PortalMessagesProps = {
  unreadCount?: number;
};

type ActiveConversation = {
  otherUserId: string;
  otherUserName: string;
};

function formatMessageTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function PortalMessages({ unreadCount: _unreadCount = 0 }: PortalMessagesProps) {
  const [showNewModal, setShowNewModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<DirectConversationSummary[]>([]);
  const [activeConversation, setActiveConversation] = useState<ActiveConversation | null>(null);
  const [threadMessages, setThreadMessages] = useState<PrivateMessageRecord[]>([]);
  const [composeText, setComposeText] = useState("");
  const [isLoadingInbox, setIsLoadingInbox] = useState(true);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const loadMemberDirectory = useCallback(async () => {
    const [{ userId }, { data: members }] = await Promise.all([
      getCurrentAuthUserId(),
      fetchMessageablePortalMembers(),
    ]);

    setCurrentUserId(userId ?? null);

    const names: Record<string, string> = {};
    for (const member of members) {
      if (member.user_id) {
        names[member.user_id] = member.full_name;
      }
    }

    return { userId, names };
  }, []);

  const loadInbox = useCallback(async () => {
    setIsLoadingInbox(true);
    setInboxError(null);

    const { userId, names } = await loadMemberDirectory();
    const { data, error } = await fetchDirectPrivateMessages();

    if (error) {
      console.error("[PortalMessages] failed to load inbox", error.message);
      setInboxError("Messages could not be loaded right now.");
      setConversations([]);
      setIsLoadingInbox(false);
      return;
    }

    if (userId) {
      setConversations(
        buildDirectConversationSummaries({
          messages: data,
          currentUserId: userId,
          memberNamesByUserId: names,
        }),
      );
    }

    setIsLoadingInbox(false);
  }, [loadMemberDirectory]);

  const loadThread = useCallback(
    async (otherUserId: string) => {
      setIsLoadingThread(true);
      setThreadError(null);

      const { data, error } = await fetchDirectMessageThread(otherUserId);

      if (error) {
        console.error("[PortalMessages] failed to load thread", error.message);
        setThreadError("This conversation could not be loaded right now.");
        setThreadMessages([]);
        setIsLoadingThread(false);
        return;
      }

      setThreadMessages(data);
      await markDirectMessagesAsRead(otherUserId);
      setIsLoadingThread(false);
      void loadInbox();
    },
    [loadInbox],
  );

  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  useEffect(() => {
    if (!activeConversation) return;
    void loadThread(activeConversation.otherUserId);
  }, [activeConversation, loadThread]);

  const hasConversations = conversations.length > 0;

  const activeSummary = useMemo(
    () =>
      activeConversation
        ? conversations.find((item) => item.otherUserId === activeConversation.otherUserId)
        : null,
    [activeConversation, conversations],
  );

  function openConversation(otherUserId: string, otherUserName: string) {
    setSendError(null);
    setComposeText("");
    setActiveConversation({ otherUserId, otherUserName });
  }

  function handleStartConversation(receiverUserId: string, memberName: string) {
    setShowNewModal(false);
    openConversation(receiverUserId, memberName);
  }

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeConversation || !composeText.trim() || isSending) return;

    setIsSending(true);
    setSendError(null);

    const { error } = await sendDirectPrivateMessage({
      receiverUserId: activeConversation.otherUserId,
      body: composeText,
    });

    setIsSending(false);

    if (error) {
      console.error("[PortalMessages] failed to send message", error.message);
      setSendError(error.message);
      return;
    }

    setComposeText("");
    await loadThread(activeConversation.otherUserId);
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

      {inboxError ? (
        <p className="portal-alert portal-alert--warning" role="alert">
          {inboxError}
        </p>
      ) : null}

      <div className="portal-messages-layout messages-layout">
        <aside className="messages-sidebar">
          {isLoadingInbox ? <p className="portal-discover-loading">Loading conversations…</p> : null}

          {!isLoadingInbox && !hasConversations ? (
            <div className="portal-messages-empty">
              <p className="portal-messages-empty-title">{earlyStageCopy.messagesEmptyTitle}</p>
              <p className="portal-messages-empty-body">{earlyStageCopy.messagesEmptyBody}</p>
              <p className="portal-messages-empty-note">{earlyStageCopy.messagesEmptyNote}</p>
            </div>
          ) : null}

          {!isLoadingInbox && hasConversations ? (
            <div className="portal-message-list">
              {conversations.map((conversation) => (
                <button
                  key={conversation.otherUserId}
                  type="button"
                  className={`portal-message-card messages-conversation${
                    activeConversation?.otherUserId === conversation.otherUserId ? " is-selected" : ""
                  }`}
                  onClick={() =>
                    openConversation(conversation.otherUserId, conversation.otherUserName)
                  }
                >
                  <span className="portal-message-avatar" aria-hidden="true" />
                  <span className="portal-message-copy">
                    <span className="portal-message-top">
                      <span className="portal-message-name">
                        {conversation.otherUserName}
                        {conversation.unreadCount > 0 ? (
                          <span className="messages-unread-badge">{conversation.unreadCount}</span>
                        ) : null}
                      </span>
                      <time dateTime={conversation.lastMessageAt}>
                        {formatMessageTime(conversation.lastMessageAt)}
                      </time>
                    </span>
                    <span
                      className={`portal-message-preview${
                        conversation.unreadCount > 0 ? " is-unread" : ""
                      }`}
                    >
                      {conversation.lastMessageBody}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </aside>

        <div className="portal-messages-panel messages-panel">
          {!activeConversation ? (
            <p className="messages-thread-empty">
              Select a conversation or start a new one with a founding member.
            </p>
          ) : (
            <>
              <header className="portal-messages-panel-head messages-panel-head">
                <h3>{activeConversation.otherUserName}</h3>
                {activeSummary?.lastMessageAt ? (
                  <p className="messages-panel-club">
                    Last message {formatMessageTime(activeSummary.lastMessageAt)}
                  </p>
                ) : null}
              </header>

              {isLoadingThread ? (
                <p className="portal-discover-loading">Loading conversation…</p>
              ) : null}

              {threadError ? (
                <p className="portal-alert portal-alert--warning" role="alert">
                  {threadError}
                </p>
              ) : null}

              <ul className="portal-messages-thread messages-thread">
                {!isLoadingThread && threadMessages.length === 0 ? (
                  <li className="messages-thread-empty">
                    No messages yet. Send the first note to {activeConversation.otherUserName}.
                  </li>
                ) : null}

                {threadMessages.map((message) => {
                  const isOwn = message.sender_id === currentUserId;
                  return (
                    <li
                      key={message.id}
                      className={`portal-message-bubble portal-message-bubble--${
                        isOwn ? "me" : "them"
                      }`}
                    >
                      <p>{message.body}</p>
                      <time dateTime={message.created_at}>
                        {formatMessageTime(message.created_at)}
                      </time>
                    </li>
                  );
                })}
              </ul>

              <form className="portal-messages-compose messages-compose" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  value={composeText}
                  onChange={(event) => setComposeText(event.target.value)}
                  placeholder={`Message ${activeConversation.otherUserName}…`}
                  disabled={isSending}
                  aria-label="Message"
                />
                <button
                  type="submit"
                  className="portal-btn portal-btn--gold portal-btn--compact"
                  disabled={isSending || !composeText.trim()}
                >
                  {isSending ? "Sending…" : "Send"}
                </button>
              </form>

              {sendError ? (
                <p className="portal-alert portal-alert--warning" role="alert">
                  {sendError}
                </p>
              ) : null}
            </>
          )}
        </div>
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
