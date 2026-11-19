import { useState } from "react";
import { Link } from "react-router-dom";
import { acceptCurrentTerms } from "../lib/termsAcceptance";
import {
  ELITETEE_PRIVACY_PATH,
  ELITETEE_TERMS_PATH,
  TERMS_ACCEPTANCE_REQUIRED_MESSAGE,
  TERMS_GATE_LEAD,
  TERMS_GATE_TITLE,
} from "../lib/termsOfUse";
import { TermsAcceptanceCheckbox } from "./TermsAcceptanceCheckbox";

type TermsAcceptanceGateProps = {
  onAccepted: () => void;
  onSignOut?: () => void | Promise<void>;
};

export function TermsAcceptanceGate({ onAccepted, onSignOut }: TermsAcceptanceGateProps) {
  const [agreed, setAgreed] = useState(false);
  const [showError, setShowError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    if (!agreed) {
      setShowError(true);
      return;
    }

    setSubmitting(true);
    setError(null);
    const result = await acceptCurrentTerms("web");
    setSubmitting(false);

    if (!result.ok) {
      setError("We could not save your agreement. Please try again.");
      return;
    }

    onAccepted();
  }

  return (
    <div className="terms-gate">
      <div className="terms-gate-card" role="dialog" aria-labelledby="terms-gate-title">
        <p className="terms-gate-eyebrow">Required to continue</p>
        <h1 id="terms-gate-title">{TERMS_GATE_TITLE}</h1>
        <p className="terms-gate-lead">{TERMS_GATE_LEAD}</p>
        <p className="terms-gate-links">
          Read the{" "}
          <Link to={ELITETEE_TERMS_PATH} target="_blank" rel="noopener noreferrer">
            Terms of Use
          </Link>{" "}
          and{" "}
          <Link to={ELITETEE_PRIVACY_PATH} target="_blank" rel="noopener noreferrer">
            Privacy Policy
          </Link>
          .
        </p>

        <TermsAcceptanceCheckbox
          id="terms-gate-agree"
          checked={agreed}
          disabled={submitting}
          showError={showError && !agreed}
          onChange={(next) => {
            setAgreed(next);
            if (next) setShowError(false);
          }}
        />

        {error ? (
          <p className="terms-gate-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="terms-gate-actions">
          <button
            type="button"
            className="portal-btn portal-btn--gold"
            disabled={submitting}
            onClick={() => void handleContinue()}
          >
            {submitting ? "Saving…" : "Agree and continue"}
          </button>
          {onSignOut ? (
            <button
              type="button"
              className="portal-btn portal-btn--outline"
              disabled={submitting}
              onClick={() => void onSignOut()}
            >
              Sign out
            </button>
          ) : null}
        </div>

        {!agreed && showError ? (
          <p className="visually-hidden">{TERMS_ACCEPTANCE_REQUIRED_MESSAGE}</p>
        ) : null}
      </div>
    </div>
  );
}
