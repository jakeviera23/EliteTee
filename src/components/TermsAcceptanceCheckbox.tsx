import { Link } from "react-router-dom";
import {
  ELITETEE_PRIVACY_PATH,
  ELITETEE_TERMS_PATH,
  TERMS_ACCEPTANCE_REQUIRED_MESSAGE,
} from "../lib/termsOfUse";

type TermsAcceptanceCheckboxProps = {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  showError?: boolean;
};

export function TermsAcceptanceCheckbox({
  id,
  checked,
  onChange,
  disabled = false,
  showError = false,
}: TermsAcceptanceCheckboxProps) {
  return (
    <div className={`terms-acceptance${showError ? " terms-acceptance--error" : ""}`}>
      <label className="terms-acceptance-label" htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          className="terms-acceptance-input"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>
          I agree to the{" "}
          <Link to={ELITETEE_TERMS_PATH} target="_blank" rel="noopener noreferrer">
            Terms of Use
          </Link>{" "}
          and{" "}
          <Link to={ELITETEE_PRIVACY_PATH} target="_blank" rel="noopener noreferrer">
            Privacy Policy
          </Link>
          , including rules prohibiting objectionable content and abusive behavior.
        </span>
      </label>
      {showError ? (
        <p className="terms-acceptance-error" role="alert">
          {TERMS_ACCEPTANCE_REQUIRED_MESSAGE}
        </p>
      ) : null}
    </div>
  );
}
