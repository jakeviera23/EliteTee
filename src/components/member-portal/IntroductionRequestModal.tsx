import { useState } from "react";
import { createIntroductionRequest } from "../../lib/introductionRequests";
import type { MemberProfileRecord } from "../../types/memberProfileRecord";
import type { IntroductionRequestType } from "../../types/introductionRequest";
import { IntroductionRequestForm } from "./IntroductionRequestForm";

type IntroductionRequestModalProps = {
  member: MemberProfileRecord;
  onClose: () => void;
  onSubmitted?: () => void;
};

export function IntroductionRequestModal({
  member,
  onClose,
  onSubmitted,
}: IntroductionRequestModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit({
    requestType,
    message,
  }: {
    requestType: IntroductionRequestType;
    message: string;
  }) {
    setIsSubmitting(true);
    setErrorMessage(null);

    const { error } = await createIntroductionRequest({
      receiverMember: member,
      requestType,
      message,
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    onSubmitted?.();
    onClose();
  }

  return (
    <div className="portal-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="portal-modal portal-modal--intro"
        role="dialog"
        aria-labelledby="introduction-request-title"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="portal-modal-head">
          <div>
            <p className="portal-eyebrow">Private Introduction</p>
            <h3 id="introduction-request-title">Request Private Introduction</h3>
          </div>
          <button
            type="button"
            className="portal-modal-close"
            onClick={onClose}
            aria-label="Close"
            disabled={isSubmitting}
          >
            ×
          </button>
        </header>

        <IntroductionRequestForm
          member={member}
          isSubmitting={isSubmitting}
          errorMessage={errorMessage}
          onSubmit={handleSubmit}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}
