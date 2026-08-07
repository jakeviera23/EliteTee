import { useRef, useState } from "react";
import { useDialogFocus } from "../../hooks/useDialogFocus";
import { introductionsCopy } from "../../data/portalSocial";
import { createIntroductionRequest } from "../../lib/introductionRequests";
import { memberFacingPortalError } from "../../lib/portalErrorDisplay";
import type { MemberProfileRecord } from "../../types/memberProfileRecord";
import type { IntroductionRequestType } from "../../types/introductionRequest";
import { IntroductionRequestForm } from "./IntroductionRequestForm";
import "../../member-portal-introductions.css";

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
  const dialogRef = useRef<HTMLElement>(null);
  useDialogFocus({ dialogRef, onEscape: onClose });
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
      console.error("[IntroductionRequestModal]", error);
      setErrorMessage(memberFacingPortalError(error.message, "introduction"));
      return;
    }

    onSubmitted?.();
    onClose();
  }

  return (
    <div className="portal-modal-backdrop" role="presentation" onClick={onClose}>
      <article
        ref={dialogRef}
        className="portal-modal et-introductions-modal"
        role="dialog"
        aria-labelledby="introduction-request-title"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="portal-modal-head">
          <div>
            <p className="et-introductions-eyebrow">{introductionsCopy.modalEyebrow}</p>
            <h3 id="introduction-request-title">{introductionsCopy.modalTitle}</h3>
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

        <div className="et-introductions-modal-body">
          <IntroductionRequestForm
            member={member}
            isSubmitting={isSubmitting}
            errorMessage={errorMessage}
            onSubmit={handleSubmit}
            onCancel={onClose}
          />
        </div>
      </article>
    </div>
  );
}
