import { FormEvent, useEffect, useState } from "react";
import {
  editPrivateMessage,
  isPrivateMessageEditable,
  mergeEditedPrivateMessage,
  PRIVATE_MESSAGE_MAX_LENGTH,
} from "../../lib/privateMessages";
import type { PrivateMessageRecord } from "../../types/privateMessage";

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
  bubbleClassName = "portal-message-bubble",
  onEdited,
}: EditablePrivateMessageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(message.body);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const canEdit = isOwn && isPrivateMessageEditable(message);

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
        <form className="portal-message-edit" onSubmit={handleSave}>
          <label className="visually-hidden" htmlFor={`edit-message-${message.id}`}>
            Edit message
          </label>
          <textarea
            id={`edit-message-${message.id}`}
            className="portal-message-edit-input"
            rows={3}
            value={draft}
            maxLength={PRIVATE_MESSAGE_MAX_LENGTH}
            onChange={(event) => setDraft(event.target.value)}
            disabled={isSaving}
            autoFocus
          />
          {editError ? (
            <p className="portal-message-edit-error" role="alert">
              {editError}
            </p>
          ) : null}
          <div className="portal-message-edit-actions">
            <button
              type="button"
              className="portal-btn portal-btn--outline portal-btn--compact"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="portal-btn portal-btn--gold portal-btn--compact"
              disabled={isSaving || !draft.trim() || draft.trim() === message.body.trim()}
            >
              {isSaving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="portal-message-body-row">
            <p className="portal-message-body">{message.body}</p>
            {canEdit ? (
              <button
                type="button"
                className="portal-message-edit-trigger"
                onClick={() => setIsEditing(true)}
                aria-label="Edit message"
              >
                Edit
              </button>
            ) : null}
          </div>
          <div className="portal-message-meta">
            <time dateTime={message.created_at}>{formatTime(message.created_at)}</time>
            {message.edited_at ? <span className="portal-message-edited">Edited</span> : null}
          </div>
        </>
      )}
    </article>
  );
}
