import { afterEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";
import {
  AUTH_CALLBACK_EXPIRED_MESSAGE,
  captureAuthCallbackFromLocation,
  capturedAuthCallbackHasWork,
  clearCapturedAuthCallback,
  parseAuthCallbackParams,
} from "./authCallbackParams";
import {
  completeAuthEntryFromCallback,
  consumeAuthEntryCallback,
  resetAuthEntryInFlightForTests,
  shouldEnterSetPasswordMode,
  type AuthEntryClient,
} from "./completeAuthEntry";
import { INVITE_ACTIVATION_RECOVERY_MESSAGE } from "./inviteCompletion";

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
    setSession:
      handlers.setSession ??
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
  clearCapturedAuthCallback();
});

describe("completeAuthEntryFromCallback", () => {
  it("sends activated sessions into the member portal", async () => {
    const setSession = vi.fn(async () => ({
      data: { session: mockSession },
      error: null,
    }));
    const auth = createAuth({ setSession });
    const snapshot = parseAuthCallbackParams(
      "https://www.elitetee.club/#access_token=abc&refresh_token=def&type=signup",
    );

    await expect(
      completeAuthEntryFromCallback(auth, snapshot, {
        finishInviteActivationAfterAuth: vi.fn(async () => ({
          ok: true as const,
          reason: "completed" as const,
          redemption: null,
        })),
      }),
    ).resolves.toEqual({
      kind: "portal",
    });

    expect(setSession).toHaveBeenCalledWith({
      access_token: "abc",
      refresh_token: "def",
    });
  });

  it("keeps recovery sessions on the password-reset path", async () => {
    const setSession = vi.fn(async () => ({
      data: { session: mockSession },
      error: null,
    }));
    const getSession = vi.fn(async () => ({
      data: { session: null },
      error: null,
    }));
    const auth = createAuth({ setSession, getSession });
    const snapshot = parseAuthCallbackParams(
      "https://www.elitetee.club/auth/callback#access_token=abc&refresh_token=def&type=recovery",
    );

    await expect(
      completeAuthEntryFromCallback(auth, snapshot, {
        finishInviteActivationAfterAuth: vi.fn(),
      }),
    ).resolves.toEqual({
      kind: "recovery",
    });

    expect(setSession).toHaveBeenCalledWith({
      access_token: "abc",
      refresh_token: "def",
    });
    // Session established via setSession; getSession must not be required.
    expect(getSession).not.toHaveBeenCalled();
  });

  it("establishes session from hash tokens before routing when getSession is empty", async () => {
    const setSession = vi.fn(async () => ({
      data: { session: mockSession },
      error: null,
    }));
    const getSession = vi.fn(async () => ({
      data: { session: null },
      error: null,
    }));
    const finishInvite = vi.fn();
    const auth = createAuth({ setSession, getSession });
    const snapshot = parseAuthCallbackParams(
      "https://www.elitetee.club/auth/callback#access_token=rec-at&refresh_token=rec-rt&type=recovery",
    );

    const result = await completeAuthEntryFromCallback(auth, snapshot, {
      finishInviteActivationAfterAuth: finishInvite,
    });

    expect(result).toEqual({ kind: "recovery" });
    expect(setSession).toHaveBeenCalledWith({
      access_token: "rec-at",
      refresh_token: "rec-rt",
    });
    expect(getSession).not.toHaveBeenCalled();
    expect(finishInvite).not.toHaveBeenCalled();
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

    await completeAuthEntryFromCallback(auth, snapshot, {
      finishInviteActivationAfterAuth: vi.fn(async () => ({
        ok: true as const,
        reason: "already_active" as const,
        redemption: null,
      })),
    });

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

  it("does not route unactivated confirmed users into the portal", async () => {
    const auth = createAuth();
    const snapshot = parseAuthCallbackParams(
      "https://www.elitetee.club/auth/callback#access_token=abc&refresh_token=def&type=signup",
    );

    await expect(
      completeAuthEntryFromCallback(auth, snapshot, {
        finishInviteActivationAfterAuth: vi.fn(async () => ({
          ok: false as const,
          reason: "redemption_failed" as const,
          message: INVITE_ACTIVATION_RECOVERY_MESSAGE,
          redemption: null,
        })),
      }),
    ).resolves.toEqual({
      kind: "login_error",
      message: INVITE_ACTIVATION_RECOVERY_MESSAGE,
    });
  });

  it("handles a recovery callback once only after consume", async () => {
    const auth = createAuth();
    const snapshot = parseAuthCallbackParams(
      "https://www.elitetee.club/auth/callback#access_token=abc&refresh_token=def&type=recovery",
    );
    captureAuthCallbackFromLocation(
      "https://www.elitetee.club/auth/callback#access_token=abc&refresh_token=def&type=recovery",
    );

    const first = await completeAuthEntryFromCallback(auth, snapshot, {
      finishInviteActivationAfterAuth: vi.fn(),
    });
    expect(first).toEqual({ kind: "recovery" });

    consumeAuthEntryCallback();

    expect(capturedAuthCallbackHasWork()).toBe(false);

    const second = await completeAuthEntryFromCallback(auth, null, {
      finishInviteActivationAfterAuth: vi.fn(),
    });
    expect(second).toEqual({ kind: "none" });
  });
});

describe("shouldEnterSetPasswordMode", () => {
  it("requires router-verified recovery or PASSWORD_RECOVERY event", () => {
    expect(shouldEnterSetPasswordMode({})).toBe(false);
    expect(shouldEnterSetPasswordMode({ recoveryVerifiedFromRouter: true })).toBe(true);
    expect(shouldEnterSetPasswordMode({ passwordRecoveryEvent: true })).toBe(true);
  });
});
