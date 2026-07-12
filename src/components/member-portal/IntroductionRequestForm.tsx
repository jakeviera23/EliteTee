import { FormEvent, useState } from "react";
import { introductionsCopy } from "../../data/portalSocial";
import {
  INTRODUCTION_REQUEST_TYPES,
  INTRODUCTION_REQUEST_TYPE_HINTS,
  type IntroductionRequestType,
} from "../../types/introductionRequest";
import type { MemberProfileRecord } from "../../types/memberProfileRecord";
import { MemberClubAvatar } from "./MemberClubAvatar";

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

  const memberMeta = [member.primary_club, member.based_in, member.founding_member_number]
    .filter(Boolean)
    .join(" · ");

  return (
    <form className="et-introductions-form" onSubmit={handleSubmit}>
      <div className="et-introductions-member-summary">
        <MemberClubAvatar member={member} name={member.full_name} size="sm" />
        <div>
          <h4>{member.full_name}</h4>
          <p>{memberMeta || "Founding member"}</p>
        </div>
      </div>

      <p className="et-introductions-form-lead">{introductionsCopy.modalLead}</p>

      {errorMessage ? (
        <p className="et-introductions-alert et-introductions-alert--error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <fieldset className="et-introductions-reasons">
        <legend>{introductionsCopy.requestType}</legend>
        <div className="et-introductions-reason-grid" role="radiogroup" aria-label="Connection reason">
          {INTRODUCTION_REQUEST_TYPES.map((type) => {
            const isSelected = requestType === type;
            return (
              <label
                key={type}
                className={`et-introductions-reason${isSelected ? " is-selected" : ""}`}
              >
                <input
                  type="radio"
                  name="introduction-reason"
                  value={type}
                  checked={isSelected}
                  onChange={() => setRequestType(type)}
                />
                <span className="et-introductions-reason-label">{type}</span>
                <span className="et-introductions-reason-hint">
                  {INTRODUCTION_REQUEST_TYPE_HINTS[type]}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <label className="portal-profile-field portal-profile-field--full">
        <span>{introductionsCopy.messageLabel}</span>
        <textarea
          rows={5}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={`${introductionsCopy.messagePrompt} ${introductionsCopy.messageHint}`}
        />
      </label>

      <div className="et-introductions-form-actions">
        <button type="submit" className="et-btn et-btn--forest" disabled={isSubmitting}>
          {isSubmitting ? introductionsCopy.submittingRequest : introductionsCopy.submitRequest}
        </button>
        <button
          type="button"
          className="et-btn et-btn--secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          {introductionsCopy.cancel}
        </button>
      </div>
    </form>
  );
}
