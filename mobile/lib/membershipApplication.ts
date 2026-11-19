/**
 * Mirrors the web "Request Membership" form (src/components/RequestIntroduction.tsx)
 * and payload builder (src/lib/membershipApplications.ts#submitMembershipApplication).
 */

export type MembershipApplicationForm = {
  fullName: string;
  email: string;
  location: string;
  homeClub: string;
  handicap: string;
  instagram: string;
  golfLove: string;
  whyJoin: string;
};

export type MembershipApplicationField = keyof MembershipApplicationForm;

export type MembershipApplicationErrors = Partial<Record<MembershipApplicationField, string>>;

export type MembershipApplicationPayload = {
  full_name: string;
  email: string;
  location: string;
  home_club: string;
  handicap: string | null;
  instagram: string | null;
  golf_love: string;
  why_join: string;
  status: "pending_review";
};

export const EMPTY_MEMBERSHIP_APPLICATION: MembershipApplicationForm = {
  fullName: "",
  email: "",
  location: "",
  homeClub: "",
  handicap: "",
  instagram: "",
  golfLove: "",
  whyJoin: "",
};

export const MEMBERSHIP_APPLICATION_LIMITS: Record<MembershipApplicationField, number> = {
  fullName: 120,
  email: 254,
  location: 120,
  homeClub: 160,
  handicap: 10,
  instagram: 60,
  golfLove: 2000,
  whyJoin: 2000,
};

const REQUIRED_FIELDS: Array<[MembershipApplicationField, string]> = [
  ["fullName", "Enter your full name."],
  ["email", "Enter your email address."],
  ["location", "Enter where you're based."],
  ["homeClub", "Enter your home course or where you play most."],
  ["golfLove", "Tell us what you love most about golf."],
  ["whyJoin", "Tell us why you want to join EliteTee."],
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MEMBERSHIP_APPLICATION_SUCCESS_MESSAGE =
  "Your request has been received. We'll review it thoughtfully.";

export const MEMBERSHIP_APPLICATION_ERROR_MESSAGE =
  "Unable to save your application right now. Please try again or email membership@elitetee.club.";

export function isValidApplicationEmail(value: string) {
  return EMAIL_PATTERN.test(value.trim());
}

export function validateMembershipApplication(
  form: MembershipApplicationForm,
): MembershipApplicationErrors {
  const errors: MembershipApplicationErrors = {};

  for (const [field, message] of REQUIRED_FIELDS) {
    if (!form[field].trim()) errors[field] = message;
  }

  if (!errors.email && !isValidApplicationEmail(form.email)) {
    errors.email = "Enter a valid email address.";
  }

  for (const field of Object.keys(MEMBERSHIP_APPLICATION_LIMITS) as MembershipApplicationField[]) {
    if (!errors[field] && form[field].trim().length > MEMBERSHIP_APPLICATION_LIMITS[field]) {
      errors[field] = `Keep this under ${MEMBERSHIP_APPLICATION_LIMITS[field]} characters.`;
    }
  }

  return errors;
}

export function hasMembershipApplicationErrors(errors: MembershipApplicationErrors) {
  return Object.keys(errors).length > 0;
}

export function buildMembershipApplicationPayload(
  form: MembershipApplicationForm,
): MembershipApplicationPayload {
  return {
    full_name: form.fullName.trim(),
    email: form.email.trim().toLowerCase(),
    location: form.location.trim(),
    home_club: form.homeClub.trim(),
    handicap: form.handicap.trim() || null,
    instagram: form.instagram.trim() || null,
    golf_love: form.golfLove.trim(),
    why_join: form.whyJoin.trim(),
    status: "pending_review",
  };
}
