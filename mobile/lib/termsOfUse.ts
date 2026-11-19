/** Keep in sync with web `src/lib/termsOfUse.ts` when bumping. */
export const ELITETEE_TERMS_VERSION = "2026-11-19";

export const ELITETEE_TERMS_PATH = "/terms";
export const ELITETEE_PRIVACY_PATH = "/privacy";

export const ELITETEE_MIN_MEMBER_AGE = 18;

export const ELITETEE_MEMBERSHIP_CONTACT_EMAIL = "membership@elitetee.club";

export const ELITETEE_PUBLIC_WEBSITE = "https://elitetee.club";

export type TermsAcceptanceSource = "web" | "ios" | "unknown";

export const TERMS_ACCEPTANCE_REQUIRED_MESSAGE =
  "Please agree to the Terms of Use and Privacy Policy to continue.";

export const AGE_ATTESTATION_REQUIRED_MESSAGE =
  `You must confirm that you are at least ${ELITETEE_MIN_MEMBER_AGE} years old to continue.`;

export const TERMS_GATE_TITLE = "Review and accept the Terms of Use";

export const TERMS_GATE_LEAD =
  "EliteTee is a private membership community for adults. Before you continue, please confirm that you agree to our Terms of Use and Privacy Policy, including rules against objectionable content and abusive behavior.";
