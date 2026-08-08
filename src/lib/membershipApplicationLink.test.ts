import { describe, expect, it } from "vitest";
import { didAutoLinkExistingAuthUser } from "./membershipApplications";

describe("didAutoLinkExistingAuthUser", () => {
  it("returns true when the RPC reports a linked auth user", () => {
    expect(didAutoLinkExistingAuthUser({ linked: true, auth_user_id: "abc" })).toBe(true);
  });

  it("returns false when no auth user exists for the application email", () => {
    expect(didAutoLinkExistingAuthUser({ linked: false, reason: "no_auth_user" })).toBe(false);
  });

  it("returns false for malformed RPC responses", () => {
    expect(didAutoLinkExistingAuthUser(null)).toBe(false);
    expect(didAutoLinkExistingAuthUser("linked")).toBe(false);
  });
});
