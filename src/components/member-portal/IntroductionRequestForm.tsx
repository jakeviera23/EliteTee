import { FormEvent, useState } from "react";
import {
  INTRODUCTION_REQUEST_TYPES,
  INTRODUCTION_REQUEST_TYPE_HINTS,
  type IntroductionRequestType,
} from "../../types/introductionRequest";
import type { MemberProfileRecord } from "../../types/memberProfileRecord";

type IntroductionRequestFormProps = {
  member: MemberProfileRecord;
  isSubmitting: boolean;
  errorMessage: string | null;
  onSubmit: (payload: { requestType: IntroductionRequestType; message: string }) => void;
  onCancel: () => void;
};

export function IntroductionRequestForm({
  member,
  isSubmitting,
  errorMessage,
  onSubmit,
  onCancel,
}: IntroductionRequestFormProps) {
  const [requestType, setRequestType] = useState<IntroductionRequestType>(
    INTRODUCTION_REQUEST_TYPES[0],
  );
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({ requestType, message });
  }

  return (
    <form className="portal-intro-form" onSubmit={handleSubmit}>
      <p className="portal-intro-form-lead">
        Request a private introduction to <strong>{member.full_name}</strong>. Your request is
        reviewed by the member before any connection is made.
      </p>

      {errorMessage ? (
        <p className="portal-alert portal-alert--error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <fieldset className="portal-intro-reasons">
        <legend>Why would you like to connect?</legend>
        <div className="portal-intro-reason-grid" role="radiogroup" aria-label="Connection reason">
          {INTRODUCTION_REQUEST_TYPES.map((type) => {
            const isSelected = requestType === type;
            return (
              <label
                key={type}
                className={`portal-intro-reason${isSelected ? " is-selected" : ""}`}
              >
                <input
                  type="radio"
                  name="introduction-reason"
                  value={type}
                  checked={isSelected}
                  onChange={() => setRequestType(type)}
                />
                <span className="portal-intro-reason-label">{type}</span>
                <span className="portal-intro-reason-hint">
                  {INTRODUCTION_REQUEST_TYPE_HINTS[type]}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <label className="portal-profile-field">
        <span>Personal message</span>
        <textarea
          rows={5}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Share context for your introduction — where you play, when you travel, or what you hope to connect on…"
          required
        />
      </label>

      <div className="portal-intro-form-actions">
        <button type="submit" className="portal-btn portal-btn--gold" disabled={isSubmitting}>
          {isSubmitting ? "Submitting request…" : "Submit Introduction Request"}
        </button>
        <button
          type="button"
          className="portal-btn portal-btn--outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
