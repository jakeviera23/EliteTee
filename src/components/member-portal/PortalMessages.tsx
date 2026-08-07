import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { earlyStageCopy, messagesCopy } from "../../data/portalSocial";
import {
  buildApprovedMemberIdentityMap,
  fetchApprovedMemberProfileByUserId,
  fetchApprovedMemberProfilesByUserIds,
  fetchOwnMemberProfile,
  type ApprovedMemberDirectoryProfile,
} from "../../lib/memberProfiles";
import { fetchIntroductionRequests } from "../../lib/introductionRequests";
import { fetchMemberCourseRoundsForUser } from "../../lib/memberCourseRounds";
import {
  buildConversationContext,
  buildConversationStarter,
  type ConversationContextItem,
} from "../../lib/conversationContext";
import {
  buildDirectConversationSummaries,
  extractDirectMessageParticipantUserIds,
  fetchDirectMessageThread,
  fetchDirectPrivateMessages,
  markDirectMessagesAsRead,
  sendDirectPrivateMessage,
} from "../../lib/privateMessages";
import { memberFacingPortalError } from "../../lib/portalErrorDisplay";
import type { DirectConversationSummary, PrivateMessageRecord } from "../../types/privateMessage";
import { getCurrentAuthUserId } from "../../lib/authUserLinking";
import type { MemberProfileRecord } from "../../types/memberProfileRecord";
import type { IntroductionRequestRecord } from "../../types/introductionRequest";
import type { ViewMemberProfileHandler } from "../../types/memberProfileNavigation";
import { EditablePrivateMessage } from "./EditablePrivateMessage";
import { MemberClubAvatar } from "./MemberClubAvatar";
import { NewConversationModal } from "./NewConversationModal";
import "../../member-portal-messages.css";

type PortalMessagesProps = {
  unreadCount?: number;
  initialConversation?: {
    otherUserId: string;
    otherUserName: string;
    draftMessage?: string;
    contributionContext?: string;
  } | null;
  onInitialConversationOpened?: () => void;
  onViewMemberProfile?: ViewMemberProfileHandler;
  onThreadOpenChange?: (isOpen: boolean) => void;
  onMeaningfulAction?: () => void;
};

type ActiveConversation = {
  otherUserId: string;
  otherUserName: string;
  contributionContext?: string;
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

function formatThreadMemberMeta(summary: DirectConversationSummary | null | undefined) {
  if (!summary) return "";
  const parts = [summary.otherUserPrimaryClub?.trim(), summary.otherUserBasedIn?.trim()].filter(
    Boolean,
  );
  return parts.join(" · ");
}

export function PortalMessages({
  unreadCount: _unreadCount = 0,
  initialConversation = null,
  onInitialConversationOpened,
  onViewMemberProfile,
  onThreadOpenChange,
  onMeaningfulAction,
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
  const [viewerProfile, setViewerProfile] = useState<MemberProfileRecord | null>(null);
  const [profilesByUserId, setProfilesByUserId] = useState<Record<string, ApprovedMemberDirectoryProfile>>({});
  const [introductionRequests, setIntroductionRequests] = useState<IntroductionRequestRecord[]>([]);
  const [conversationContext, setConversationContext] = useState<ConversationContextItem[]>([]);
  const [visualViewport, setVisualViewport] = useState<{ height: number; offsetTop: number } | null>(null);
  const composeInputRef = useRef<HTMLTextAreaElement>(null);
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

    const [{ data, error }, ownProfileResult, introductionResult] = await Promise.all([
      fetchDirectPrivateMessages(),
      fetchOwnMemberProfile(),
      fetchIntroductionRequests(),
    ]);

    setViewerProfile(ownProfileResult.data ?? null);
    setIntroductionRequests(introductionResult.data ?? []);

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
    const nextProfilesByUserId: Record<string, ApprovedMemberDirectoryProfile> = {};
    for (const profile of profiles ?? []) {
      if (profile.user_id) nextProfilesByUserId[profile.user_id] = profile;
    }
    setProfilesByUserId(nextProfilesByUserId);

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
    setComposeText(initialConversation.draftMessage ?? "");
    setActiveConversation({
      otherUserId: initialConversation.otherUserId,
      otherUserName: initialConversation.otherUserName,
      contributionContext: initialConversation.contributionContext,
    });
    onInitialConversationOpened?.();
  }, [initialConversation, onInitialConversationOpened]);

  useEffect(() => {
    if (!activeConversation) return;
    void loadThread(activeConversation.otherUserId);
  }, [activeConversation, loadThread]);

  useEffect(() => {
    if (!activeConversation || !currentUserId) {
      setConversationContext([]);
      return;
    }

    const otherUserId = activeConversation.otherUserId;
    const viewerUserId = currentUserId;
    let cancelled = false;
    async function loadConversationContext() {
      const knownProfile = profilesByUserId[otherUserId];
      const [profileResult, viewerRoundsResult, memberRoundsResult] = await Promise.all([
        knownProfile
          ? Promise.resolve({ data: knownProfile, error: null })
          : fetchApprovedMemberProfileByUserId(otherUserId),
        fetchMemberCourseRoundsForUser(viewerUserId, 24),
        fetchMemberCourseRoundsForUser(otherUserId, 24),
      ]);
      if (cancelled) return;
      setConversationContext(
        buildConversationContext({
          viewer: viewerProfile,
          member: profileResult.data,
          introductionRequests,
          viewerRounds: viewerRoundsResult.data ?? [],
          memberRounds: memberRoundsResult.data ?? [],
        }),
      );
    }

    void loadConversationContext();
    return () => {
      cancelled = true;
    };
  }, [activeConversation, currentUserId, introductionRequests, profilesByUserId, viewerProfile]);

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

  useEffect(() => {
    const textarea = composeInputRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 136)}px`;
  }, [composeText, activeConversation?.otherUserId]);

  const hasConversations = conversations.length > 0;
  const showMobileThread = Boolean(activeConversation);

  useEffect(() => {
    onThreadOpenChange?.(showMobileThread);
    return () => onThreadOpenChange?.(false);
  }, [onThreadOpenChange, showMobileThread]);

  useEffect(() => {
    if (!showMobileThread || !window.visualViewport) {
      setVisualViewport(null);
      return;
    }
    const viewport = window.visualViewport;
    function updateViewport() {
      setVisualViewport({ height: viewport!.height, offsetTop: viewport!.offsetTop });
    }
    updateViewport();
    viewport.addEventListener("resize", updateViewport);
    viewport.addEventListener("scroll", updateViewport);
    return () => {
      viewport.removeEventListener("resize", updateViewport);
      viewport.removeEventListener("scroll", updateViewport);
    };
  }, [showMobileThread]);

  const activeSummary = useMemo(
    () =>
      activeConversation
        ? conversations.find((item) => item.otherUserId === activeConversation.otherUserId)
        : null,
    [activeConversation, conversations],
  );

  const threadMemberMeta = formatThreadMemberMeta(activeSummary);

  function openConversation(otherUserId: string, otherUserName: string) {
    setSendError(null);
    setComposeText("");
    setActiveConversation({ otherUserId, otherUserName, contributionContext: undefined });
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
          lastMessageWasEdited: Boolean(updated.edited_at),
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
      setSendError(memberFacingPortalError(error.message, "message"));
      return;
    }

    setComposeText("");
    await loadThread(activeConversation.otherUserId);
    onMeaningfulAction?.();
  }

  function handleComposeKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <section className="et-messages" aria-labelledby="messages-heading">
      <header className="et-messages-header">
        <div className="et-messages-header-copy">
          <p className="et-messages-eyebrow">{messagesCopy.eyebrow}</p>
          <h2 id="messages-heading" className="et-messages-title">
            {messagesCopy.title}
          </h2>
          <p className="et-messages-lead">{messagesCopy.lead}</p>
        </div>
        <button
          type="button"
          className="et-btn et-btn--forest"
          onClick={() => setShowNewModal(true)}
        >
          {messagesCopy.newConversation}
        </button>
      </header>

      {inboxError ? (
        <div className="et-messages-thread-error" role="alert">
          <p className="et-messages-alert">{inboxError}</p>
          <button type="button" className="et-btn et-btn--secondary et-btn--sm" onClick={() => void loadInbox()}>
            Retry
          </button>
        </div>
      ) : null}

      <div className="et-messages-layout">
        <aside
          className={`et-messages-sidebar${showMobileThread ? " is-hidden-mobile" : ""}`}
          aria-label="Conversations"
        >
          {isLoadingInbox ? (
            <p className="et-messages-loading">{messagesCopy.loadingInbox}</p>
          ) : null}

          {!isLoadingInbox && !hasConversations ? (
            <div className="et-messages-empty">
              <p className="et-messages-empty-title">{earlyStageCopy.messagesEmptyTitle}</p>
              <p className="et-messages-empty-copy">{earlyStageCopy.messagesEmptyBody}</p>
              <p className="et-messages-empty-copy">{earlyStageCopy.messagesEmptyNote}</p>
              <button type="button" className="et-btn et-btn--forest et-btn--sm et-messages-empty-action" onClick={() => setShowNewModal(true)}>
                Start a conversation
              </button>
            </div>
          ) : null}

          {!isLoadingInbox && hasConversations ? (
            <div className="et-messages-list">
              {conversations.map((conversation) => {
                const isSelected =
                  activeConversation?.otherUserId === conversation.otherUserId;
                const previewPrefix = conversation.lastMessageWasEdited ? "Edited · " : "";

                return (
                  <button
                    key={conversation.otherUserId}
                    type="button"
                    className={`et-messages-conversation${isSelected ? " is-selected" : ""}`}
                    onClick={() => openConversationFromSummary(conversation)}
                    aria-current={isSelected ? "true" : undefined}
                  >
                    <MemberClubAvatar
                      member={{ club_logo_url: conversation.otherUserPhotoUrl ?? null }}
                      name={conversation.otherUserName}
                      size="sm"
                    />
                    <span className="et-messages-conversation-copy">
                      <span className="et-messages-conversation-top">
                        <span className="et-messages-conversation-name">
                          {conversation.otherUserName}
                          {conversation.otherUserFoundingNumber ? (
                            <span className="et-messages-founding-badge">
                              {conversation.otherUserFoundingNumber}
                            </span>
                          ) : null}
                          {conversation.unreadCount > 0 ? (
                            conversation.unreadCount > 1 ? (
                              <span className="et-messages-unread-count" aria-label={`${conversation.unreadCount} unread`}>
                                {conversation.unreadCount}
                              </span>
                            ) : (
                              <span className="et-messages-unread-dot" aria-label="Unread" />
                            )
                          ) : null}
                        </span>
                        <time dateTime={conversation.lastMessageAt}>
                          {formatMessageTime(conversation.lastMessageAt)}
                        </time>
                      </span>
                      <p
                        className={`et-messages-preview${
                          conversation.unreadCount > 0 ? " is-unread" : ""
                        }`}
                      >
                        {conversation.lastMessageWasEdited ? (
                          <span className="et-messages-preview-edited">{previewPrefix}</span>
                        ) : null}
                        {conversation.lastMessageBody}
                      </p>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </aside>

        <div
          className={`et-messages-panel${showMobileThread ? " is-visible-mobile" : ""}`}
          style={visualViewport ? ({
            "--et-message-viewport-height": `${visualViewport.height}px`,
            "--et-message-viewport-top": `${visualViewport.offsetTop}px`,
          } as CSSProperties) : undefined}
        >
          {!activeConversation ? (
            <div className="et-messages-panel-placeholder">
              <p className="et-messages-panel-placeholder-title">{messagesCopy.selectThread}</p>
              <p className="et-messages-panel-placeholder-copy">{messagesCopy.selectThreadHint}</p>
              {!hasConversations ? (
                <button type="button" className="et-btn et-btn--secondary et-btn--sm" onClick={() => setShowNewModal(true)}>
                  Find a member
                </button>
              ) : null}
            </div>
          ) : (
            <>
              <header className="et-messages-thread-head">
                <button
                  type="button"
                  className="et-messages-back"
                  onClick={closeConversation}
                  aria-label={messagesCopy.backToList}
                >
                  ‹
                </button>
                <div className="et-messages-thread-identity">
                  <MemberClubAvatar
                    member={{
                      club_logo_url: activeSummary?.otherUserPhotoUrl ?? null,
                    }}
                    name={activeConversation.otherUserName}
                    size="sm"
                  />
                  <div className="et-messages-thread-identity-copy">
                    <h3 className="et-messages-thread-name">{activeConversation.otherUserName}</h3>
                    {threadMemberMeta ? (
                      <p className="et-messages-thread-meta">{threadMemberMeta}</p>
                    ) : activeSummary?.otherUserFoundingNumber ? (
                      <p className="et-messages-thread-meta">
                        {activeSummary.otherUserFoundingNumber}
                      </p>
                    ) : null}
                  </div>
                </div>
                {onViewMemberProfile ? (
                  <div className="et-messages-thread-actions">
                    <button
                      type="button"
                      className="et-btn et-btn--secondary et-btn--sm"
                      onClick={() =>
                        onViewMemberProfile(
                          activeConversation.otherUserId,
                          activeConversation.otherUserName,
                        )
                      }
                    >
                      {messagesCopy.viewProfile}
                    </button>
                  </div>
                ) : null}
              </header>

              {conversationContext.length > 0 || activeConversation.contributionContext ? (
                <div className="et-messages-context" aria-label="Conversation context">
                  <span className="et-messages-context-label">
                    {activeConversation.contributionContext ? "From the network" : "Connection context"}
                  </span>
                  <div className="et-messages-context-items">
                    {activeConversation.contributionContext ? (
                      <span className="et-messages-context-item et-messages-context-item--contribution">
                        {activeConversation.contributionContext}
                      </span>
                    ) : null}
                    {conversationContext.map((item) => (
                      <span key={`${item.kind}-${item.label}`} className={`et-messages-context-item et-messages-context-item--${item.kind}`}>
                        {item.label}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="et-messages-thread-scroll">
                {isLoadingThread ? (
                  <p className="et-messages-loading">{messagesCopy.loadingThread}</p>
                ) : null}

                {threadError ? (
                  <div className="et-messages-thread-error">
                    <p className="et-messages-alert" role="alert">
                      {threadError}
                    </p>
                    <button
                      type="button"
                      className="et-btn et-btn--secondary et-btn--sm"
                      onClick={() => void loadThread(activeConversation.otherUserId)}
                    >
                      {messagesCopy.retryThread}
                    </button>
                  </div>
                ) : null}

                {!isLoadingThread && !threadError && threadMessages.length === 0 ? (
                  <div className="et-messages-thread-empty">
                    <p className="et-messages-thread-empty-title">{messagesCopy.threadEmptyTitle}</p>
                    <p className="et-messages-thread-empty-copy">
                      {buildConversationStarter(activeConversation.otherUserName, conversationContext)}
                    </p>
                  </div>
                ) : null}

                <ul className="et-messages-thread" aria-live="polite">
                  {threadMessages.map((message) => {
                    const isOwn = message.sender_id === currentUserId;
                    return (
                      <li
                        key={message.id}
                        className={`et-messages-bubble et-messages-bubble--${
                          isOwn ? "me" : "them"
                        }`}
                      >
                        <EditablePrivateMessage
                          message={message}
                          isOwn={isOwn}
                          senderLabel={isOwn ? "You" : activeConversation.otherUserName}
                          formatTime={formatMessageTime}
                          bubbleClassName="et-messages-bubble-inner"
                          onEdited={handleMessageEdited}
                        />
                      </li>
                    );
                  })}
                  <li ref={threadEndRef} className="et-messages-thread-end" aria-hidden="true" />
                </ul>
              </div>

              <form className="et-messages-compose" onSubmit={handleSendMessage}>
                <label className="visually-hidden" htmlFor="messages-compose-input">
                  {messagesCopy.composeLabel}
                </label>
                <textarea
                  id="messages-compose-input"
                  ref={composeInputRef}
                  className="et-messages-compose-input"
                  rows={1}
                  value={composeText}
                  onChange={(event) => setComposeText(event.target.value)}
                  onKeyDown={handleComposeKeyDown}
                  placeholder={messagesCopy.composePlaceholder(activeConversation.otherUserName)}
                  disabled={isSending || isLoadingThread}
                  aria-label={messagesCopy.composeLabel}
                />
                <button
                  type="submit"
                  className="et-btn et-btn--forest"
                  disabled={isSending || !composeText.trim() || isLoadingThread}
                  aria-label={messagesCopy.send}
                >
                  {isSending ? messagesCopy.sending : messagesCopy.send}
                </button>
                {sendError ? (
                  <p className="et-messages-send-error" role="alert">
                    {sendError}
                  </p>
                ) : null}
              </form>
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
