import { FormEvent, useEffect, useMemo, useState } from "react";
import { formatOwnMessageReadReceipt } from "../../lib/messageReadReceipt";
import {
  editPrivateMessage,
  isPrivateMessageEditable,
  mergeEditedPrivateMessage,
  PRIVATE_MESSAGE_MAX_LENGTH,
} from "../../lib/privateMessages";
import type { PrivateMessageRecord } from "../../types/privateMessage";
import { MessageImageLightbox } from "./MessageImageLightbox";

type EditablePrivateMessageProps = {
  message: PrivateMessageRecord;
  isOwn: boolean;
  formatTime: (value: string) => string;
  bubbleClassName?: string;
  onEdited?: (message: PrivateMessageRecord) => void;
};

export function EditablePrivateMessage({
  message,
  isOwn,
  formatTime,
  bubbleClassName = "et-messages-bubble-inner",
  onEdited,
}: EditablePrivateMessageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(message.body);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const canEdit = isOwn && isPrivateMessageEditable(message);
  const attachments = message.attachments ?? [];
  const signedUrls = useMemo(
    () => attachments.map((item) => item.signedUrl).filter((url): url is string => Boolean(url)),
    [attachments],
  );
  const hasBody = Boolean(message.body.trim());

  useEffect(() => {
    if (!isEditing) {
      setDraft(message.body);
      setEditError(null);
    }
  }, [message.body, isEditing]);

  useEffect(() => {
    if (!isEditing) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsEditing(false);
        setDraft(message.body);
        setEditError(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEditing, message.body]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    setEditError(null);

    const { data, error } = await editPrivateMessage({
      messageId: message.id,
      body: draft,
    });

    setIsSaving(false);

    if (error || !data) {
      setEditError(error?.message ?? "Message could not be updated.");
      return;
    }

    onEdited?.(mergeEditedPrivateMessage(message, data));
    setIsEditing(false);
  }

  function handleCancel() {
    setIsEditing(false);
    setDraft(message.body);
    setEditError(null);
  }

  return (
    <article className={bubbleClassName}>
      {isEditing ? (
        <form className="et-messages-edit-form" onSubmit={handleSave}>
          <label className="visually-hidden" htmlFor={`edit-message-${message.id}`}>
            Edit message
          </label>
          <textarea
            id={`edit-message-${message.id}`}
            className="et-messages-edit-input"
            rows={3}
            value={draft}
            maxLength={PRIVATE_MESSAGE_MAX_LENGTH}
            onChange={(event) => setDraft(event.target.value)}
            disabled={isSaving}
            autoFocus
          />
          {editError ? (
            <p className="et-messages-edit-error" role="alert">
              {editError}
            </p>
          ) : null}
          <div className="et-messages-edit-actions">
            <button
              type="button"
              className="et-btn et-btn--secondary et-btn--sm"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="et-btn et-btn--forest et-btn--sm"
              disabled={isSaving || !draft.trim() || draft.trim() === message.body.trim()}
            >
              {isSaving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      ) : (
        <>
          {attachments.length > 0 ? (
            <div
              className={`et-messages-attachments${
                attachments.length > 1 ? " et-messages-attachments--grid" : ""
              }`}
            >
              {attachments.map((attachment, index) => {
                const url = attachment.signedUrl;
                if (!url) {
                  return (
                    <div key={attachment.id} className="et-messages-attachment-fallback">
                      Photo unavailable
                    </div>
                  );
                }
                return (
                  <button
                    key={attachment.id}
                    type="button"
                    className="et-messages-attachment-button"
                    onClick={() => setLightboxIndex(index)}
                    aria-label="Open image"
                  >
                    <img className="et-messages-attachment-image" src={url} alt="" loading="lazy" />
                  </button>
                );
              })}
            </div>
          ) : null}

          {hasBody ? (
            <div className="et-messages-body-row">
              <p className="et-messages-body">{message.body}</p>
              {canEdit ? (
                <button
                  type="button"
                  className="et-messages-edit-trigger"
                  onClick={() => setIsEditing(true)}
                  aria-label="Edit message"
                >
                  Edit
                </button>
              ) : null}
            </div>
          ) : canEdit ? (
            <div className="et-messages-body-row">
              <button
                type="button"
                className="et-messages-edit-trigger"
                onClick={() => setIsEditing(true)}
                aria-label="Edit message"
              >
                Edit
              </button>
            </div>
          ) : null}

          <div className="et-messages-meta">
            <time dateTime={message.created_at}>{formatTime(message.created_at)}</time>
            {message.edited_at ? <span className="et-messages-edited">Edited</span> : null}
            {isOwn ? (
              <span className="et-messages-receipt">{formatOwnMessageReadReceipt(message.read_at)}</span>
            ) : null}
          </div>
        </>
      )}

      {lightboxIndex != null && signedUrls.length > 0 ? (
        <MessageImageLightbox
          urls={signedUrls}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}
    </article>
  );
}
