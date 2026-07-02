import { FormEvent, useEffect, useState } from "react";
import { fetchPrivateMessages, markIntroductionMessagesAsRead, sendPrivateMessage } from "../../lib/privateMessages";
import type { IntroductionRequestRecord } from "../../types/introductionRequest";
import type { PrivateMessageRecord } from "../../types/privateMessage";

type PrivateMessageModalProps = {
  request: IntroductionRequestRecord;
  currentUserId: string;
  onClose: () => void;
  onMessagesRead?: () => void;
};

function getOtherMemberName(request: IntroductionRequestRecord, currentUserId: string) {
  if (request.sender_id === currentUserId) {
    return request.receiver_name ?? "Private Member";
  }
  return request.sender_name ?? "Private Member";
}

function formatMessageTime(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return createdAt;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function PrivateMessageModal({
  request,
  currentUserId,
  onClose,
  onMessagesRead,
}: PrivateMessageModalProps) {
  const [messages, setMessages] = useState<PrivateMessageRecord[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const otherMemberName = getOtherMemberName(request, currentUserId);

  async function loadMessages() {
    setIsLoading(true);
    setErrorMessage(null);

    const { data, error } = await fetchPrivateMessages(request.id);

    if (error) {
      setErrorMessage(error.message);
      setMessages([]);
    } else {
      setMessages(data ?? []);
      await markIntroductionMessagesAsRead(request.id);
      onMessagesRead?.();
    }

    setIsLoading(false);
  }

  useEffect(() => {
    loadMessages();
  }, [request.id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSending(true);
    setErrorMessage(null);

    const { error } = await sendPrivateMessage({
      introductionRequestId: request.id,
      body: draft,
    });

    setIsSending(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setDraft("");
    await loadMessages();
  }

  return (
    <div className="portal-modal" role="dialog" aria-modal="true" aria-labelledby="private-message-title">
      <button
        type="button"
        className="portal-modal-backdrop"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div className="portal-modal-card portal-modal-card--wide portal-message-modal">
        <p className="portal-eyebrow">Private Conversation</p>
        <h3 id="private-message-title">Private Conversation with {otherMemberName}</h3>
        <p className="portal-modal-text">
          Discreet correspondence for your accepted {request.request_type.toLowerCase()} introduction.
        </p>

        {errorMessage ? (
          <p className="portal-alert portal-alert--error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <div className="portal-message-thread" aria-live="polite">
          {isLoading ? (
            <p className="portal-empty">Retrieving correspondence...</p>
          ) : messages.length === 0 ? (
            <p className="portal-empty">Private correspondence will appear here once exchanged.</p>
          ) : (
            <ul className="portal-message-list">
              {messages.map((message) => {
                const isOwn = message.sender_id === currentUserId;
                return (
                  <li
                    key={message.id}
                    className={`portal-message-item${isOwn ? " is-own" : ""}`}
                  >
                    <article className="portal-message-bubble">
                      <p>{message.body}</p>
                      <time dateTime={message.created_at}>{formatMessageTime(message.created_at)}</time>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <form className="portal-message-compose" onSubmit={handleSubmit}>
          <label className="portal-profile-field">
            <span className="visually-hidden">Message</span>
            <textarea
              rows={3}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Write a private message..."
              required
            />
          </label>
          <div className="portal-message-compose-actions">
            <button type="submit" className="portal-btn portal-btn--gold" disabled={isSending}>
              {isSending ? "Sending..." : "Send Message"}
            </button>
            <button
              type="button"
              className="portal-btn portal-btn--outline"
              onClick={onClose}
              disabled={isSending}
            >
              Close
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
