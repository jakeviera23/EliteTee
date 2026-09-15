import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";
import {
  captureAuthCallbackFromLocation,
  clearCapturedAuthCallback,
} from "./authCallbackParams";
import {
  completeAuthEntryFromCallback,
  consumeAuthEntryCallback,
  resetAuthEntryInFlightForTests,
  shouldEnterSetPasswordMode,
  type AuthEntryClient,
} from "./completeAuthEntry";
import {
  PASSWORD_RECOVERY_PENDING_STORAGE_KEY,
  clearPasswordRecoveryPending,
  hasPasswordRecoveryVerifiedIntent,
  isPasswordRecoveryPending,
  markPasswordRecoveryPending,
  resolveAuthCallbackLoginNavigation,
  shouldAutoRedirectAuthenticatedSessionToPortal,
} from "./passwordRecoveryIntent";

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

function installMemorySessionStorage() {
  const map = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return Array.from(map.keys())[index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
  };
  Object.defineProperty(globalThis, "sessionStorage", {
    value: storage,
    configurable: true,
    writable: true,
  });
}

function createAuth(): AuthEntryClient {
  return {
    verifyOtp: vi.fn(async () => ({
      data: { session: mockSession },
      error: null,
    })),
    setSession: vi.fn(async () => ({
      data: { session: mockSession },
      error: null,
    })),
    getSession: vi.fn(async () => ({
      data: { session: mockSession },
      error: null,
    })),
  };
}

async function completeRecoveryCallbackFlow(auth: AuthEntryClient) {
  const navigations: Array<{ path: string; state?: unknown }> = [];
  const result = await completeAuthEntryFromCallback(auth, undefined, {
    finishInviteActivationAfterAuth: vi.fn(),
  });
  consumeAuthEntryCallback();

  if (result.kind === "recovery") {
    markPasswordRecoveryPending();
    navigations.push({ path: "/login", state: { recoveryVerified: true } });
  } else if (result.kind === "portal") {
    navigations.push({ path: "/member-portal" });
  }

  return { result, navigations };
}

beforeEach(() => {
  installMemorySessionStorage();
});

afterEach(() => {
  resetAuthEntryInFlightForTests();
  clearCapturedAuthCallback();
  clearPasswordRecoveryPending();
});

describe("passwordRecoveryIntent storage", () => {
  it("marks, reads, and clears recovery pending state", () => {
    expect(isPasswordRecoveryPending()).toBe(false);

    markPasswordRecoveryPending();
    expect(isPasswordRecoveryPending()).toBe(true);
    expect(sessionStorage.getItem(PASSWORD_RECOVERY_PENDING_STORAGE_KEY)).toBe("1");

    clearPasswordRecoveryPending();
    expect(isPasswordRecoveryPending()).toBe(false);
    expect(sessionStorage.getItem(PASSWORD_RECOVERY_PENDING_STORAGE_KEY)).toBeNull();
  });
});

describe("recovery set-password UX gates", () => {
  it("recovery callback marks pending and lands in set-password mode", async () => {
    captureAuthCallbackFromLocation(
      "https://www.elitetee.club/auth/callback#access_token=abc&refresh_token=def&type=recovery",
    );
    const auth = createAuth();

    const { result, navigations } = await completeRecoveryCallbackFlow(auth);

    expect(result).toEqual({ kind: "recovery" });
    expect(navigations).toEqual([{ path: "/login", state: { recoveryVerified: true } }]);
    expect(isPasswordRecoveryPending()).toBe(true);
    expect(
      shouldEnterSetPasswordMode({
        recoveryVerifiedFromRouter: hasPasswordRecoveryVerifiedIntent(true),
      }),
    ).toBe(true);
    expect(
      shouldEnterSetPasswordMode({
        recoveryVerifiedFromRouter: hasPasswordRecoveryVerifiedIntent(false),
      }),
    ).toBe(true);
  });

  it("SIGNED_IN / existing session does not redirect to portal while recovery pending", () => {
    markPasswordRecoveryPending();

    expect(
      shouldAutoRedirectAuthenticatedSessionToPortal({
        recoveryVerifiedFromRouter: false,
      }),
    ).toBe(false);

    expect(
      shouldAutoRedirectAuthenticatedSessionToPortal({
        recoveryVerifiedFromRouter: true,
      }),
    ).toBe(false);
  });

  it("bare /login AuthCallback fallback preserves recovery state", () => {
    markPasswordRecoveryPending();

    expect(resolveAuthCallbackLoginNavigation()).toEqual({
      path: "/login",
      state: { recoveryVerified: true },
    });
  });

  it("successful password update clears recovery flag and allows portal", () => {
    markPasswordRecoveryPending();
    expect(isPasswordRecoveryPending()).toBe(true);

    // Mirrors handleSetPassword success path before portal navigation.
    clearPasswordRecoveryPending();

    expect(isPasswordRecoveryPending()).toBe(false);
    expect(
      shouldAutoRedirectAuthenticatedSessionToPortal({
        recoveryVerifiedFromRouter: false,
      }),
    ).toBe(true);
  });

  it("normal login still routes to portal when recovery is not pending", () => {
    expect(isPasswordRecoveryPending()).toBe(false);
    expect(
      shouldAutoRedirectAuthenticatedSessionToPortal({
        recoveryVerifiedFromRouter: false,
      }),
    ).toBe(true);
    expect(resolveAuthCallbackLoginNavigation()).toEqual({ path: "/login" });
  });

  it("cancel/sign-out clears recovery intent so a leftover session cannot portal-skip set-password forever", () => {
    markPasswordRecoveryPending();
    clearPasswordRecoveryPending();

    expect(hasPasswordRecoveryVerifiedIntent(false)).toBe(false);
    expect(
      shouldAutoRedirectAuthenticatedSessionToPortal({
        recoveryVerifiedFromRouter: false,
      }),
    ).toBe(true);
  });
});
