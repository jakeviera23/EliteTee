import { describe, expect, it } from "vitest";
import {
  inviteSignupSessionConflict,
  inviteSignupSessionConflictMessage,
  normalizeAuthEmail,
} from "./inviteSignupSession";

describe("normalizeAuthEmail", () => {
  it("lowercases and trims email addresses", () => {
    expect(normalizeAuthEmail("  Member@Example.com  ")).toBe("member@example.com");
    expect(normalizeAuthEmail("")).toBeNull();
    expect(normalizeAuthEmail(null)).toBeNull();
  });
});

describe("inviteSignupSessionConflict", () => {
  it("returns null when there is no session", () => {
    expect(inviteSignupSessionConflict(null, "member@example.com")).toBeNull();
  });

  it("returns null when session email matches the invite email", () => {
    expect(
      inviteSignupSessionConflict("Member@Example.com", "member@example.com"),
    ).toBeNull();
  });

  it("returns conflict details when another account is signed in", () => {
    expect(
      inviteSignupSessionConflict("founder@example.com", "member@example.com"),
    ).toEqual({
      signedInEmail: "founder@example.com",
      inviteEmail: "member@example.com",
    });
  });
});

describe("inviteSignupSessionConflictMessage", () => {
  it("names both the active session and invited email", () => {
    expect(
      inviteSignupSessionConflictMessage("founder@example.com", "member@example.com"),
    ).toBe(
      "You're currently signed in as founder@example.com. Sign out before creating the account for member@example.com.",
    );
  });
});
