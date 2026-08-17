import { afterEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";
import { AUTH_CALLBACK_EXPIRED_MESSAGE, parseAuthCallbackParams } from "./authCallbackParams";
import {
  completeAuthEntryFromCallback,
  resetAuthEntryInFlightForTests,
  type AuthEntryClient,
} from "./completeAuthEntry";

const mockSession = {
  access_token: "token",
  refresh_token: "refresh",
  expires_in: 3600,
  token_type: "bearer",
  user: {
    id: "user-1",
    aud: "authenticated",
    role: "authenticated",
    email: "member@example.com",
    app_metadata: {},
    user_metadata: {},
    created_at: "2026-01-01T00:00:00.000Z",
  },
} as Session;

vi.mock("./membershipInviteRedemption", () => ({
  tryCompleteAuthenticatedInviteRedemption: vi.fn(async () => ({
    completed: true,
    method: "approved_application",
    data: { completed: true },
    error: null,
  })),
}));

vi.mock("./supabase", () => ({
  supabase: null,
}));

function createAuth(handlers: Partial<AuthEntryClient> = {}): AuthEntryClient {
  return {
    verifyOtp:
      handlers.verifyOtp ??
      vi.fn(async () => ({
        data: { session: mockSession },
        error: null,
      })),
    getSession:
      handlers.getSession ??
      vi.fn(async () => ({
        data: { session: mockSession },
        error: null,
      })),
  };
}

afterEach(() => {
  resetAuthEntryInFlightForTests();
});

describe("completeAuthEntryFromCallback", () => {
  it("sends confirmed sessions into the member portal", async () => {
    const auth = createAuth();
    const snapshot = parseAuthCallbackParams(
      "https://www.elitetee.club/#access_token=abc&type=signup",
    );

    await expect(completeAuthEntryFromCallback(auth, snapshot)).resolves.toEqual({
      kind: "portal",
    });
  });

  it("keeps recovery sessions on the password-reset path", async () => {
    const auth = createAuth();
    const snapshot = parseAuthCallbackParams(
      "https://www.elitetee.club/auth/callback#access_token=abc&type=recovery",
    );

    await expect(completeAuthEntryFromCallback(auth, snapshot)).resolves.toEqual({
      kind: "recovery",
    });
  });

  it("verifies token_hash links before reading the session", async () => {
    const verifyOtp = vi.fn(async () => ({
      data: { session: mockSession },
      error: null,
    }));
    const auth = createAuth({ verifyOtp });
    const snapshot = parseAuthCallbackParams(
      "https://www.elitetee.club/auth/callback?token_hash=hash123&type=signup",
    );

    await completeAuthEntryFromCallback(auth, snapshot);

    expect(verifyOtp).toHaveBeenCalledWith({
      token_hash: "hash123",
      type: "signup",
    });
  });

  it("returns a login error for expired confirmation links", async () => {
    const auth = createAuth({
      getSession: vi.fn(async () => ({
        data: { session: null },
        error: null,
      })),
    });
    const snapshot = parseAuthCallbackParams(
      "https://www.elitetee.club/#error=access_denied&error_code=otp_expired",
    );

    await expect(completeAuthEntryFromCallback(auth, snapshot)).resolves.toEqual({
      kind: "login_error",
      message: AUTH_CALLBACK_EXPIRED_MESSAGE,
    });
  });
});
