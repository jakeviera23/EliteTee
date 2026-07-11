import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { earlyStageCopy } from "../../data/portalSocial";
import {
  buildApprovedMemberIdentityMap,
  fetchApprovedMemberProfilesByUserIds,
} from "../../lib/memberProfiles";
import {
  buildDirectConversationSummaries,
  extractDirectMessageParticipantUserIds,
  fetchDirectMessageThread,
  fetchDirectPrivateMessages,
  markDirectMessagesAsRead,
  sendDirectPrivateMessage,
} from "../../lib/privateMessages";
import type { DirectConversationSummary, PrivateMessageRecord } from "../../types/privateMessage";
import { getCurrentAuthUserId } from "../../lib/authUserLinking";
import type { ViewMemberProfileHandler } from "../../types/memberProfileNavigation";
import { EditablePrivateMessage } from "./EditablePrivateMessage";
import { MemberClubAvatar } from "./MemberClubAvatar";
import { NewConversationModal } from "./NewConversationModal";

type PortalMessagesProps = {
  unreadCount?: number;
  initialConversation?: {
    otherUserId: string;
    otherUserName: string;
  } | null;
  onInitialConversationOpened?: () => void;
  onViewMemberProfile?: ViewMemberProfileHandler;
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

export function PortalMessages({
  unreadCount: _unreadCount = 0,
  initialConversation = null,
  onInitialConversationOpened,
  onViewMemberProfile,
}: PortalMessagesProps) {
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
  const composeInputRef = useRef<HTMLInputElement>(null);
  const threadEndRef = useRef<HTMLLIElement>(null);

  const loadInbox = useCallback(async () => {
    setIsLoadingInbox(true);
    setInboxError(null);

    const { userId } = await getCurrentAuthUserId();
    setCurrentUserId(userId ?? null);

    if (!userId) {
      setConversations([]);
      setIsLoadingInbox(false);
      return;
    }

    const { data, error } = await fetchDirectPrivateMessages();

    if (error) {
      console.error("[PortalMessages] failed to load inbox", error.message);
      setInboxError("Messages could not be loaded right now.");
      setConversations([]);
      setIsLoadingInbox(false);
      return;
    }

    const messages = data ?? [];
    const participantIds = extractDirectMessageParticipantUserIds(messages, userId);
    const { data: profiles, error: profileError } =
      await fetchApprovedMemberProfilesByUserIds(participantIds);

    if (profileError) {
      console.error("[PortalMessages] failed to hydrate conversation identities", {
        message: profileError.message,
        participantIds,
      });
    }

    const memberIdentitiesByUserId = buildApprovedMemberIdentityMap(profiles ?? []);

    setConversations(
      buildDirectConversationSummaries({
        messages,
        currentUserId: userId,
        memberIdentitiesByUserId,
      }),
    );

    setIsLoadingInbox(false);
  }, []);

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
    if (!initialConversation) return;
    setSendError(null);
    setComposeText("");
    setActiveConversation({
      otherUserId: initialConversation.otherUserId,
      otherUserName: initialConversation.otherUserName,
    });
    onInitialConversationOpened?.();
  }, [initialConversation, onInitialConversationOpened]);

  useEffect(() => {
    if (!activeConversation) return;
    void loadThread(activeConversation.otherUserId);
  }, [activeConversation, loadThread]);

  useEffect(() => {
    if (!activeConversation || isLoadingThread || threadError) return;

    const frameId = window.requestAnimationFrame(() => {
      threadEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [activeConversation, isLoadingThread, threadError, threadMessages]);

  useEffect(() => {
    if (!activeConversation || isLoadingThread) return;

    const timerId = window.setTimeout(() => {
      composeInputRef.current?.focus({ preventScroll: true });
    }, 120);

    return () => window.clearTimeout(timerId);
  }, [activeConversation?.otherUserId, isLoadingThread]);

  const hasConversations = conversations.length > 0;
  const showMobileThread = Boolean(activeConversation);

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

  function openConversationFromSummary(conversation: DirectConversationSummary) {
    openConversation(conversation.otherUserId, conversation.otherUserName);
  }

  function closeConversation() {
    setSendError(null);
    setComposeText("");
    setActiveConversation(null);
  }

  function handleStartConversation(receiverUserId: string, memberName: string) {
    setShowNewModal(false);
    openConversation(receiverUserId, memberName);
  }

  function handleMessageEdited(updated: PrivateMessageRecord) {
    setThreadMessages((current) =>
      current.map((message) => (message.id === updated.id ? updated : message)),
    );

    setConversations((current) =>
      current.map((conversation) => {
        if (conversation.otherUserId !== activeConversation?.otherUserId) {
          return conversation;
        }

        if (conversation.lastMessageAt !== updated.created_at) {
          return conversation;
        }

        return {
          ...conversation,
          lastMessageBody: updated.body,
        };
      }),
    );
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
        <aside
          className={`messages-sidebar${showMobileThread ? " is-hidden-mobile" : ""}`}
        >
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
                  onClick={() => openConversationFromSummary(conversation)}
                >
                  <MemberClubAvatar
                    member={{ club_logo_url: conversation.otherUserPhotoUrl ?? null }}
                    name={conversation.otherUserName}
                    size="sm"
                  />
                  <span className="portal-message-copy">
                    <span className="portal-message-top">
                      <span className="portal-message-name">
                        {conversation.otherUserName}
                        {conversation.otherUserFoundingNumber ? (
                          <span className="portal-message-fm-badge">
                            {conversation.otherUserFoundingNumber}
                          </span>
                        ) : null}
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

        <div
          className={`portal-messages-panel messages-panel${
            showMobileThread ? " is-visible-mobile" : ""
          }`}
        >
          {!activeConversation ? (
            <p className="messages-thread-empty">
              Select a conversation or start a new one with a founding member.
            </p>
          ) : (
            <>
              <header className="portal-messages-panel-head messages-panel-head">
                <button
                  type="button"
                  className="messages-back-btn"
                  onClick={closeConversation}
                  aria-label="Back to messages"
                >
                  ‹
                </button>
                <div className="messages-panel-head-main">
                  {onViewMemberProfile ? (
                    <button
                      type="button"
                      className="messages-panel-profile-link"
                      onClick={() =>
                        onViewMemberProfile(
                          activeConversation.otherUserId,
                          activeConversation.otherUserName,
                        )
                      }
                    >
                      <span className="messages-panel-profile-identity">
                        <MemberClubAvatar
                          member={{
                            club_logo_url:
                              activeSummary?.otherUserPhotoUrl ??
                              conversations.find(
                                (item) => item.otherUserId === activeConversation.otherUserId,
                              )?.otherUserPhotoUrl ??
                              null,
                          }}
                          name={activeConversation.otherUserName}
                          size="sm"
                        />
                        <span>
                          <h3>{activeConversation.otherUserName}</h3>
                          {activeSummary?.otherUserFoundingNumber ? (
                            <p className="messages-panel-club">
                              {activeSummary.otherUserFoundingNumber}
                            </p>
                          ) : null}
                        </span>
                      </span>
                    </button>
                  ) : (
                    <h3>{activeConversation.otherUserName}</h3>
                  )}
                  {activeSummary?.lastMessageAt && !onViewMemberProfile ? (
                    <p className="messages-panel-club">
                      Last message {formatMessageTime(activeSummary.lastMessageAt)}
                    </p>
                  ) : null}
                  {activeSummary?.lastMessageAt && onViewMemberProfile ? (
                    <p className="messages-panel-club messages-panel-club--sub">
                      Last message {formatMessageTime(activeSummary.lastMessageAt)}
                    </p>
                  ) : null}
                </div>
              </header>

              {isLoadingThread ? (
                <p className="portal-discover-loading">Loading conversation…</p>
              ) : null}

              {threadError ? (
                <div className="messages-thread-error">
                  <p className="portal-alert portal-alert--warning" role="alert">
                    {threadError}
                  </p>
                  <button
                    type="button"
                    className="portal-btn portal-btn--outline portal-btn--compact"
                    onClick={() => void loadThread(activeConversation.otherUserId)}
                  >
                    Retry
                  </button>
                </div>
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
                      <EditablePrivateMessage
                        message={message}
                        isOwn={isOwn}
                        formatTime={formatMessageTime}
                        bubbleClassName="portal-message-bubble-inner"
                        onEdited={handleMessageEdited}
                      />
                    </li>
                  );
                })}
                <li ref={threadEndRef} className="messages-thread-end" aria-hidden="true" />
              </ul>

              <form className="portal-messages-compose messages-compose" onSubmit={handleSendMessage}>
                <input
                  ref={composeInputRef}
                  type="text"
                  value={composeText}
                  onChange={(event) => setComposeText(event.target.value)}
                  placeholder={`Message ${activeConversation.otherUserName}…`}
                  disabled={isSending || isLoadingThread}
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
