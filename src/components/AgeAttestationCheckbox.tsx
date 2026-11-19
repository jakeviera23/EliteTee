import { ELITETEE_MIN_MEMBER_AGE, AGE_ATTESTATION_REQUIRED_MESSAGE } from "../lib/termsOfUse";

type AgeAttestationCheckboxProps = {
  id?: string;
  checked: boolean;
  disabled?: boolean;
  showError?: boolean;
  onChange: (checked: boolean) => void;
};

export function AgeAttestationCheckbox({
  id = "age-attestation",
  checked,
  disabled = false,
  showError = false,
  onChange,
}: AgeAttestationCheckboxProps) {
  return (
    <div className="terms-acceptance">
      <label className="terms-acceptance-label" htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>
          I confirm that I am at least {ELITETEE_MIN_MEMBER_AGE} years old and eligible for EliteTee
          membership.
        </span>
      </label>
      {showError ? (
        <p className="terms-acceptance-error" role="alert">
          {AGE_ATTESTATION_REQUIRED_MESSAGE}
        </p>
      ) : null}
    </div>
  );
}
