import { describe, expect, it } from "vitest";
import { getAdminEmails, isAdminEmail } from "./admin";

describe("admin allowlist helpers", () => {
  it("parses empty admin env as no admins", () => {
    // When VITE_ADMIN_EMAILS is unset in test, helpers must fail closed.
    expect(Array.isArray(getAdminEmails())).toBe(true);
    expect(isAdminEmail(undefined)).toBe(false);
    expect(isAdminEmail("")).toBe(false);
  });
});
