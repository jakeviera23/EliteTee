import { describe, expect, it } from "vitest";
import {
  buildMembershipApplicationPayload,
  EMPTY_MEMBERSHIP_APPLICATION,
  hasMembershipApplicationErrors,
  type MembershipApplicationForm,
  validateMembershipApplication,
} from "./membershipApplication";

const VALID_FORM: MembershipApplicationForm = {
  fullName: "  Jordan Spieth ",
  email: " Jordan@Example.COM ",
  location: "Dallas, TX",
  homeClub: "Brook Hollow",
  handicap: " +2.1 ",
  instagram: "",
  golfLove: "Links golf in the wind.",
  whyJoin: "Meet serious golfers.",
};

describe("validateMembershipApplication", () => {
  it("requires the same fields as the web form", () => {
    const errors = validateMembershipApplication(EMPTY_MEMBERSHIP_APPLICATION);
    expect(Object.keys(errors).sort()).toEqual(
      ["email", "fullName", "golfLove", "homeClub", "location", "whyJoin"].sort(),
    );
    expect(errors).not.toHaveProperty("handicap");
    expect(errors).not.toHaveProperty("instagram");
  });

  it("rejects whitespace-only required answers", () => {
    const errors = validateMembershipApplication({ ...VALID_FORM, whyJoin: "   " });
    expect(errors.whyJoin).toBeDefined();
  });

  it("validates email format", () => {
    expect(validateMembershipApplication({ ...VALID_FORM, email: "not-an-email" }).email).toBe(
      "Enter a valid email address.",
    );
    expect(validateMembershipApplication({ ...VALID_FORM, email: "a@b" }).email).toBeDefined();
  });

  it("caps field lengths", () => {
    const errors = validateMembershipApplication({ ...VALID_FORM, whyJoin: "x".repeat(2001) });
    expect(errors.whyJoin).toMatch(/under 2000/);
  });

  it("accepts a complete application", () => {
    expect(hasMembershipApplicationErrors(validateMembershipApplication(VALID_FORM))).toBe(false);
  });
});

describe("buildMembershipApplicationPayload", () => {
  it("matches the web insert payload shape", () => {
    expect(buildMembershipApplicationPayload(VALID_FORM)).toEqual({
      full_name: "Jordan Spieth",
      email: "jordan@example.com",
      location: "Dallas, TX",
      home_club: "Brook Hollow",
      handicap: "+2.1",
      instagram: null,
      golf_love: "Links golf in the wind.",
      why_join: "Meet serious golfers.",
      status: "pending_review",
    });
  });

  it("never sends privileged or referral attribution fields", () => {
    const payload = buildMembershipApplicationPayload(VALID_FORM) as Record<string, unknown>;
    for (const field of [
      "referrer_member_user_id",
      "member_profile_id",
      "invite_token",
      "billing_required",
      "reviewed_at",
    ]) {
      expect(payload).not.toHaveProperty(field);
    }
  });
});
