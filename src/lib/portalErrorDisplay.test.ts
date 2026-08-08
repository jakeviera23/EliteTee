import { describe, expect, it, vi } from "vitest";
import {
  formatMemberPortalError,
  memberFacingCoverPhotoError,
  memberFacingPortalError,
} from "./portalErrorDisplay";

describe("memberFacingPortalError", () => {
  it("maps auth errors without exposing raw text", () => {
    expect(memberFacingPortalError("JWT expired")).toBe("Please sign in again to continue.");
  });

  it("maps RLS errors to a member-safe message", () => {
    expect(memberFacingPortalError("new row violates row-level security policy")).toBe(
      "You do not have permission to complete this action.",
    );
  });

  it("uses context-specific fallbacks", () => {
    expect(memberFacingPortalError("FunctionsHttpError: 500", "message")).toBe(
      "Your message could not be sent. Please try again.",
    );
    expect(memberFacingPortalError("unexpected", "feed")).toBe("Your changes could not be saved.");
    expect(memberFacingPortalError("unexpected", "profile")).toBe(
      "Your profile could not be saved. Please try again.",
    );
  });

  it("maps location validation errors to a member-safe message", () => {
    expect(memberFacingPortalError("Location must be between 2 and 200 characters.", "feed")).toBe(
      "Add a course location (city, state, or country) to share this round.",
    );
  });

  it("appends raw server errors in development", () => {
    vi.stubEnv("DEV", true);
    expect(formatMemberPortalError("Location must be between 2 and 200 characters.", "feed")).toBe(
      "Add a course location (city, state, or country) to share this round. (Location must be between 2 and 200 characters.)",
    );
    vi.unstubAllEnvs();
  });
});

describe("memberFacingCoverPhotoError", () => {
  it("returns a specific cover-photo message while preserving other saved changes", () => {
    expect(memberFacingCoverPhotoError("permission denied for function")).toBe(
      "You do not have permission to change the cover photo on this experience.",
    );
    expect(memberFacingCoverPhotoError("unexpected rpc failure")).toBe(
      "Your cover photo could not be updated, but your other changes were saved.",
    );
  });
});
