import { FormEvent, useState } from "react";
import {
  INTRODUCTION_REQUEST_TYPES,
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
      <p className="portal-eyebrow">Private Introduction</p>
      <h3 id="portal-modal-title">Request Private Introduction</h3>
      <p className="portal-modal-text">
        Submit a discreet introduction request to <strong>{member.full_name}</strong>.
      </p>

      {errorMessage ? (
        <p className="portal-alert portal-alert--error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <label className="portal-profile-field">
        <span>Request Type</span>
        <select
          value={requestType}
          onChange={(event) => setRequestType(event.target.value as IntroductionRequestType)}
          required
        >
          {INTRODUCTION_REQUEST_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>

      <label className="portal-profile-field">
        <span>Message</span>
        <textarea
          rows={4}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Share context for your private introduction request..."
          required
        />
      </label>

      <div className="portal-intro-form-actions">
        <button type="submit" className="portal-btn portal-btn--gold" disabled={isSubmitting}>
          {isSubmitting ? "Sending..." : "Send Request"}
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
