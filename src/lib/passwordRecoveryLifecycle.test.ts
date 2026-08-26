import { afterEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";
import {
  captureAuthCallbackFromLocation,
  capturedAuthCallbackHasWork,
  clearCapturedAuthCallback,
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

function createAuth(): AuthEntryClient {
  return {
    verifyOtp: vi.fn(async () => ({
      data: { session: mockSession },
      error: null,
    })),
    getSession: vi.fn(async () => ({
      data: { session: mockSession },
      error: null,
    })),
  };
}

/**
 * Mirrors AuthEntryHandler: complete once, consume, then navigate by kind.
 * Asserts a later "pathname change" cannot reopen recovery.
 */
async function handleAuthEntryOnce(
  auth: AuthEntryClient,
  activation: {
    finishInviteActivationAfterAuth: () => Promise<{
      ok: boolean;
      reason?: string;
      message?: string;
      redemption: null;
    }>;
  },
) {
  const navigations: Array<{ path: string; state?: unknown }> = [];

  if (!capturedAuthCallbackHasWork()) {
    return { navigations, result: { kind: "none" as const } };
  }

  const result = await completeAuthEntryFromCallback(auth, undefined, activation as never);
  consumeAuthEntryCallback();

  if (result.kind === "portal") {
    navigations.push({ path: "/member-portal" });
  } else if (result.kind === "recovery") {
    navigations.push({ path: "/login", state: { recoveryVerified: true } });
  } else if (result.kind === "login_error") {
    navigations.push({ path: "/login", state: { authError: result.message } });
  }

  return { navigations, result };
}

afterEach(() => {
  resetAuthEntryInFlightForTests();
  clearCapturedAuthCallback();
});

describe("password recovery lifecycle", () => {
  it("does not reopen set-password after recovery is consumed and user navigates", async () => {
    captureAuthCallbackFromLocation(
      "https://www.elitetee.club/auth/callback#access_token=abc&type=recovery",
    );
    const auth = createAuth();

    const first = await handleAuthEntryOnce(auth, {
      finishInviteActivationAfterAuth: vi.fn(),
    });

    expect(first.result).toEqual({ kind: "recovery" });
    expect(first.navigations).toEqual([
      { path: "/login", state: { recoveryVerified: true } },
    ]);
    expect(capturedAuthCallbackHasWork()).toBe(false);

    // Simulated pathname change after password reset / portal navigation.
    const second = await handleAuthEntryOnce(auth, {
      finishInviteActivationAfterAuth: vi.fn(),
    });

    expect(second.result).toEqual({ kind: "none" });
    expect(second.navigations).toEqual([]);
    expect(
      shouldEnterSetPasswordMode({
        recoveryVerifiedFromRouter: false,
        passwordRecoveryEvent: false,
      }),
    ).toBe(false);
  });

  it("keeps activated-member portal navigation stable after password update consume", async () => {
    captureAuthCallbackFromLocation(
      "https://www.elitetee.club/auth/callback#access_token=abc&type=recovery",
    );
    const auth = createAuth();

    const recovery = await handleAuthEntryOnce(auth, {
      finishInviteActivationAfterAuth: vi.fn(),
    });
    expect(recovery.result.kind).toBe("recovery");

    // Successful password update ends recovery before going to portal.
    consumeAuthEntryCallback();
    expect(capturedAuthCallbackHasWork()).toBe(false);

    const afterPortalNav = await handleAuthEntryOnce(auth, {
      finishInviteActivationAfterAuth: vi.fn(async () => ({
        ok: true,
        reason: "already_active",
        redemption: null,
      })),
    });

    expect(afterPortalNav.result.kind).toBe("none");
    expect(afterPortalNav.navigations).toEqual([]);
  });

  it("returns to normal sign-in after refresh once recovery capture is gone", () => {
    expect(capturedAuthCallbackHasWork()).toBe(false);
    expect(
      shouldEnterSetPasswordMode({
        recoveryVerifiedFromRouter: false,
        passwordRecoveryEvent: false,
      }),
    ).toBe(false);
  });

  it("Craig-class incomplete onboarding does not re-enter set-password on navigation alone", async () => {
    captureAuthCallbackFromLocation(
      "https://www.elitetee.club/auth/callback#access_token=abc&type=recovery",
    );
    const auth = createAuth();

    await handleAuthEntryOnce(auth, {
      finishInviteActivationAfterAuth: vi.fn(),
    });

    // Password updated; activation failed; user remains on sign-in and navigates away.
    consumeAuthEntryCallback();

    const afterNavigate = await handleAuthEntryOnce(auth, {
      finishInviteActivationAfterAuth: vi.fn(async () => ({
        ok: false,
        reason: "no_approved_application",
        message: INVITE_ACTIVATION_RECOVERY_MESSAGE,
        redemption: null,
      })),
    });

    expect(afterNavigate.result.kind).toBe("none");
    expect(afterNavigate.navigations).toEqual([]);
    expect(
      shouldEnterSetPasswordMode({
        recoveryVerifiedFromRouter: false,
        passwordRecoveryEvent: false,
      }),
    ).toBe(false);
  });

  it("preserves signup callback routing into portal after consume", async () => {
    captureAuthCallbackFromLocation(
      "https://www.elitetee.club/auth/callback#access_token=abc&type=signup",
    );
    const auth = createAuth();

    const first = await handleAuthEntryOnce(auth, {
      finishInviteActivationAfterAuth: vi.fn(async () => ({
        ok: true,
        reason: "completed",
        redemption: null,
      })),
    });

    expect(first.result).toEqual({ kind: "portal" });
    expect(first.navigations).toEqual([{ path: "/member-portal" }]);

    const second = await handleAuthEntryOnce(auth, {
      finishInviteActivationAfterAuth: vi.fn(async () => ({
        ok: true,
        reason: "completed",
        redemption: null,
      })),
    });

    expect(second.result.kind).toBe("none");
    expect(second.navigations).toEqual([]);
  });

  it("preserves invite confirmation login_error when activation fails", async () => {
    captureAuthCallbackFromLocation(
      "https://www.elitetee.club/auth/callback#access_token=abc&type=invite",
    );
    const auth = createAuth();

    const first = await handleAuthEntryOnce(auth, {
      finishInviteActivationAfterAuth: vi.fn(async () => ({
        ok: false,
        reason: "redemption_failed",
        message: INVITE_ACTIVATION_RECOVERY_MESSAGE,
        redemption: null,
      })),
    });

    expect(first.result).toEqual({
      kind: "login_error",
      message: INVITE_ACTIVATION_RECOVERY_MESSAGE,
    });
    expect(first.navigations).toEqual([
      { path: "/login", state: { authError: INVITE_ACTIVATION_RECOVERY_MESSAGE } },
    ]);
  });
});
