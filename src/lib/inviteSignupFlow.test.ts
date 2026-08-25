import { describe, expect, it, vi } from "vitest";
import {
  INVITE_SIGNUP_ACCOUNT_EXISTS_MESSAGE,
  INVITE_SIGNUP_EMAIL_RATE_LIMIT_MESSAGE,
  INVITE_SIGNUP_PASSWORD_MISMATCH_MESSAGE,
  establishInviteSignupSession,
  isEmailRateLimitError,
  signInInviteSession,
  toInviteSignupUiState,
  validateInviteSignupForm,
  type InviteSignupAuthClient,
} from "./inviteSignupFlow";

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
} as const;

function createAuthClient(handlers: {
  signUp?: InviteSignupAuthClient["signUp"];
  signInWithPassword?: InviteSignupAuthClient["signInWithPassword"];
  resend?: InviteSignupAuthClient["resend"];
}): InviteSignupAuthClient {
  return {
    signUp:
      handlers.signUp ??
      vi.fn(async () => ({
        data: { user: null, session: null },
        error: null,
      })),
    signInWithPassword:
      handlers.signInWithPassword ??
      vi.fn(async () => ({
        data: { session: null },
        error: null,
      })),
    resend:
      handlers.resend ??
      vi.fn(async () => ({
        error: null,
      })),
  };
}

describe("validateInviteSignupForm", () => {
  it("returns password mismatch before submission", () => {
    expect(
      validateInviteSignupForm({
        email: "member@example.com",
        inviteEmail: "member@example.com",
        password: "password-one",
        confirmPassword: "password-two",
      }),
    ).toEqual({
      ok: false,
      message: INVITE_SIGNUP_PASSWORD_MISMATCH_MESSAGE,
    });
  });
});

describe("establishInviteSignupSession", () => {
  it("returns a session when signup succeeds immediately", async () => {
    const auth = createAuthClient({
      signUp: vi.fn(async () => ({
        data: { user: { id: "user-1" }, session: mockSession },
        error: null,
      })),
    });

    const result = await establishInviteSignupSession(
      auth,
      "member@example.com",
      "password123",
      { emailRedirectTo: "https://www.elitetee.club/auth/callback" },
    );

    expect(result).toEqual({
      status: "session",
      session: mockSession,
    });
    expect(auth.signUp).toHaveBeenCalledWith({
      email: "member@example.com",
      password: "password123",
      options: { emailRedirectTo: "https://www.elitetee.club/auth/callback" },
    });
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("handles email rate-limit errors after the auth user was created", async () => {
    const auth = createAuthClient({
      signUp: vi.fn(async () => ({
        data: { user: { id: "user-1" }, session: null },
        error: { message: "email rate limit exceeded", code: "over_email_send_rate_limit" },
      })),
      signInWithPassword: vi.fn(async () => ({
        data: { session: null },
        error: { message: "Email not confirmed" },
      })),
    });

    const result = await establishInviteSignupSession(auth, "member@example.com", "password123");

    expect(result).toEqual({
      status: "pending_verification",
      accountCreated: true,
      reason: "email_rate_limit",
      message: INVITE_SIGNUP_EMAIL_RATE_LIMIT_MESSAGE,
    });
  });

  it("signs in when the account already exists", async () => {
    const auth = createAuthClient({
      signUp: vi.fn(async () => ({
        data: { user: null, session: null },
        error: { message: "User already registered" },
      })),
      signInWithPassword: vi.fn(async () => ({
        data: { session: mockSession },
        error: null,
      })),
    });

    const result = await establishInviteSignupSession(auth, "member@example.com", "password123");

    expect(result).toEqual({
      status: "session",
      session: mockSession,
    });
  });

  it("returns account exists when signup and sign-in both fail for an existing user", async () => {
    const auth = createAuthClient({
      signUp: vi.fn(async () => ({
        data: { user: null, session: null },
        error: { message: "User already registered" },
      })),
      signInWithPassword: vi.fn(async () => ({
        data: { session: null },
        error: { message: "Invalid login credentials" },
      })),
    });

    const result = await establishInviteSignupSession(auth, "member@example.com", "password123");

    expect(result).toEqual({
      status: "account_exists",
      message: INVITE_SIGNUP_ACCOUNT_EXISTS_MESSAGE,
    });
  });
});

describe("toInviteSignupUiState", () => {
  it("maps account_exists into Sign in to finish setup", () => {
    expect(
      toInviteSignupUiState({
        status: "account_exists",
        message: INVITE_SIGNUP_ACCOUNT_EXISTS_MESSAGE,
      }),
    ).toEqual({
      kind: "sign_in_to_finish",
      message: INVITE_SIGNUP_ACCOUNT_EXISTS_MESSAGE,
    });
  });
});

describe("signInInviteSession", () => {
  it("returns a session for correct credentials on an existing Auth account", async () => {
    const auth = createAuthClient({
      signInWithPassword: vi.fn(async () => ({
        data: { session: mockSession },
        error: null,
      })),
    });

    await expect(signInInviteSession(auth, "weskpatt@gmail.com", "password123")).resolves.toEqual({
      status: "session",
      session: mockSession,
    });
  });

  it("keeps wrong-password users on the invite page without inventing success", async () => {
    const auth = createAuthClient({
      signInWithPassword: vi.fn(async () => ({
        data: { session: null },
        error: { message: "Invalid login credentials" },
      })),
    });

    await expect(signInInviteSession(auth, "weskpatt@gmail.com", "wrong-password")).resolves.toEqual(
      {
        status: "error",
        message: "The email or password is incorrect. Please try again or reset your password.",
      },
    );
  });
});

describe("isEmailRateLimitError", () => {
  it("detects Supabase over_email_send_rate_limit codes", () => {
    expect(
      isEmailRateLimitError({
        message: "email rate limit exceeded",
        code: "over_email_send_rate_limit",
      }),
    ).toBe(true);
  });
});
