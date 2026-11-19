import { describe, expect, it } from "vitest";
import {
  ACCOUNT_DELETION_MESSAGES,
  isDeletionConfirmationValid,
  parseAccountDeletionResponse,
} from "./accountDeletion";

describe("account deletion confirmation", () => {
  it("accepts only DELETE (trimmed, case-sensitive)", () => {
    expect(isDeletionConfirmationValid("DELETE")).toBe(true);
    expect(isDeletionConfirmationValid("  DELETE ")).toBe(true);
    expect(isDeletionConfirmationValid("delete")).toBe(false);
    expect(isDeletionConfirmationValid("DELET")).toBe(false);
    expect(isDeletionConfirmationValid("")).toBe(false);
  });
});

describe("parseAccountDeletionResponse", () => {
  it("treats ok responses as deleted", () => {
    expect(parseAccountDeletionResponse(200, { ok: true, deleted: true })).toEqual({
      kind: "deleted",
    });
  });

  it("does not treat a 200 without ok as success", () => {
    expect(parseAccountDeletionResponse(200, { ok: false }).kind).toBe("unknown");
  });

  it("maps 401 to session expired", () => {
    expect(parseAccountDeletionResponse(401, { ok: false, error: "unauthorized" })).toEqual({
      kind: "session_expired",
      message: ACCOUNT_DELETION_MESSAGES.sessionExpired,
    });
  });

  it("maps partial failures to a retryable incomplete outcome", () => {
    const outcome = parseAccountDeletionResponse(500, {
      ok: false,
      error: "deletion_incomplete",
      step: "remove_storage",
      retryable: true,
    });
    expect(outcome).toEqual({ kind: "incomplete", message: ACCOUNT_DELETION_MESSAGES.incomplete });
  });

  it("maps unavailable and network failures", () => {
    expect(parseAccountDeletionResponse(503, { ok: false, error: "unavailable" }).kind).toBe(
      "unavailable",
    );
    expect(parseAccountDeletionResponse(null, null).kind).toBe("network");
  });

  it("never surfaces raw server messages", () => {
    const outcome = parseAccountDeletionResponse(500, {
      ok: false,
      message: "relation users violates foreign key on secret_table",
    });
    expect(outcome.kind).toBe("unknown");
    if (outcome.kind !== "deleted") {
      expect(outcome.message).not.toContain("secret_table");
    }
  });
});
