import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PENDING_INVITE_TOKEN_STORAGE_KEY,
  clearPendingInviteToken,
  didCompleteInviteRedemption,
  readPendingInviteToken,
  storePendingInviteToken,
} from "./membershipInviteRedemption";

describe("membershipInviteRedemption storage", () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    const memoryStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    };
    vi.stubGlobal("localStorage", memoryStorage);
    vi.stubGlobal("sessionStorage", memoryStorage);
    vi.stubGlobal("window", { localStorage: memoryStorage, sessionStorage: memoryStorage });
  });

  afterEach(() => {
    clearPendingInviteToken();
    vi.unstubAllGlobals();
  });

  it("stores and reads the pending invite token", () => {
    storePendingInviteToken("abc123");
    expect(readPendingInviteToken()).toBe("abc123");
    expect(localStorage.getItem(PENDING_INVITE_TOKEN_STORAGE_KEY)).toBe("abc123");
  });

  it("clears the pending invite token", () => {
    storePendingInviteToken("abc123");
    clearPendingInviteToken();
    expect(readPendingInviteToken()).toBeNull();
  });
});

describe("didCompleteInviteRedemption", () => {
  it("recognizes successful invite-token redemption", () => {
    expect(didCompleteInviteRedemption({ portal_access_enabled: true })).toBe(true);
  });

  it("recognizes successful pending-application completion", () => {
    expect(didCompleteInviteRedemption({ completed: true })).toBe(true);
  });

  it("returns false for incomplete responses", () => {
    expect(didCompleteInviteRedemption({ completed: false, reason: "no_approved_application" })).toBe(
      false,
    );
  });
});
