import type { Session } from "@supabase/supabase-js";

export const INVITE_SIGNUP_EMAIL_RATE_LIMIT_MESSAGE =
  "Your account was created, but we could not send the verification email yet. Please wait a little while before requesting another email.";

export const INVITE_SIGNUP_PENDING_VERIFICATION_MESSAGE =
  "Your account was created. Open the confirmation email we just sent — that link will take you into EliteTee.";

export const INVITE_SIGNUP_ACCOUNT_EXISTS_MESSAGE =
  "An account already exists for this email. Sign in instead, or resend the verification email if you have not confirmed your address yet.";

export const INVITE_SIGNUP_PASSWORD_MISMATCH_MESSAGE = "Passwords do not match.";

export const INVITE_SIGNUP_EMAIL_MISMATCH_MESSAGE =
  "Use the same email address that was approved for this invitation.";

export const INVITE_SIGNUP_GENERIC_ERROR_MESSAGE =
  "We couldn't finish setting up your account. Please try again in a moment.";

export const INVITE_SIGNUP_RESEND_SUCCESS_MESSAGE =
  "If your account is waiting for verification, a new email has been sent. Please check your inbox.";

export const INVITE_SIGNUP_RESEND_RATE_LIMIT_MESSAGE =
  "We couldn't send another verification email yet. Please wait a little while and try again.";

export type InviteSignupValidationResult =
  | { ok: true; normalizedEmail: string }
  | { ok: false; message: string };

export type InviteSignupAuthResult =
  | { status: "session"; session: Session }
  | {
      status: "pending_verification";
      accountCreated: true;
      reason: "email_rate_limit" | "email_confirmation";
      message: string;
    }
  | {
      status: "account_exists";
      message: string;
    }
  | {
      status: "error";
      message: string;
    };

export type InviteSignupUiState =
  | { kind: "form" }
  | {
      kind: "pending_verification";
      message: string;
      canResend: boolean;
    }
  | {
      kind: "account_exists";
      message: string;
    };

type AuthErrorLike = {
  message?: string;
  code?: string;
  status?: number;
};

export type InviteSignupAuthClient = {
  signUp: (params: {
    email: string;
    password: string;
    options?: { emailRedirectTo?: string };
  }) => Promise<{
    data: { user: { id: string } | null; session: Session | null };
    error: AuthErrorLike | null;
  }>;
  signInWithPassword: (params: {
    email: string;
    password: string;
  }) => Promise<{
    data: { session: Session | null };
    error: AuthErrorLike | null;
  }>;
  resend: (params: {
    type: "signup";
    email: string;
    options?: { emailRedirectTo?: string };
  }) => Promise<{
    error: AuthErrorLike | null;
  }>;
};

function asAuthError(error: unknown): AuthErrorLike {
  if (error && typeof error === "object") {
    return error as AuthErrorLike;
  }

  return { message: String(error) };
}

export function getAuthErrorMessage(error: unknown): string {
  return asAuthError(error).message?.trim() ?? "";
}

export function getAuthErrorCode(error: unknown): string | null {
  const code = asAuthError(error).code?.trim();
  return code || null;
}

export function isEmailRateLimitError(error: unknown): boolean {
  const message = getAuthErrorMessage(error).toLowerCase();
  const code = getAuthErrorCode(error)?.toLowerCase() ?? "";

  return (
    message.includes("rate limit") ||
    message.includes("rate_limit") ||
    message.includes("email rate limit") ||
    message.includes("over_email_send_rate_limit") ||
    code === "over_email_send_rate_limit" ||
    asAuthError(error).status === 429
  );
}

export function isAccountAlreadyExistsError(error: unknown): boolean {
  const message = getAuthErrorMessage(error).toLowerCase();
  const code = getAuthErrorCode(error)?.toLowerCase() ?? "";

  return (
    message.includes("already") ||
    message.includes("registered") ||
    message.includes("user already") ||
    code === "user_already_exists"
  );
}

export function logInviteSignupDevError(scope: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.error(`[InviteSignup] ${scope}`, error);
  }
}

export function mapInviteSignupAuthError(error: unknown): string {
  logInviteSignupDevError("auth error", error);

  if (isEmailRateLimitError(error)) {
    return INVITE_SIGNUP_RESEND_RATE_LIMIT_MESSAGE;
  }

  if (isAccountAlreadyExistsError(error)) {
    return INVITE_SIGNUP_ACCOUNT_EXISTS_MESSAGE;
  }

  return INVITE_SIGNUP_GENERIC_ERROR_MESSAGE;
}

export function mapInviteSignupCompletionError(error: unknown): string {
  logInviteSignupDevError("complete invite error", error);

  const message = getAuthErrorMessage(error).toLowerCase();

  if (message.includes("email does not match")) {
    return INVITE_SIGNUP_EMAIL_MISMATCH_MESSAGE;
  }

  if (message.includes("invalid") || message.includes("expired")) {
    return "This invitation is no longer valid. Contact membership@elitetee.club for help.";
  }

  return INVITE_SIGNUP_GENERIC_ERROR_MESSAGE;
}

export function mapInviteSignupResendError(error: unknown): string {
  logInviteSignupDevError("resend verification error", error);

  if (isEmailRateLimitError(error)) {
    return INVITE_SIGNUP_RESEND_RATE_LIMIT_MESSAGE;
  }

  return INVITE_SIGNUP_GENERIC_ERROR_MESSAGE;
}

export function validateInviteSignupForm(input: {
  email: string;
  inviteEmail: string;
  password: string;
  confirmPassword: string;
}): InviteSignupValidationResult {
  const normalizedEmail = input.email.trim().toLowerCase();
  const inviteEmail = input.inviteEmail.trim().toLowerCase();

  if (normalizedEmail !== inviteEmail) {
    return { ok: false, message: INVITE_SIGNUP_EMAIL_MISMATCH_MESSAGE };
  }

  if (input.password.length < 8) {
    return { ok: false, message: "Password must be at least 8 characters." };
  }

  if (input.password !== input.confirmPassword) {
    return { ok: false, message: INVITE_SIGNUP_PASSWORD_MISMATCH_MESSAGE };
  }

  return { ok: true, normalizedEmail };
}

export function toInviteSignupUiState(result: InviteSignupAuthResult): InviteSignupUiState {
  if (result.status === "pending_verification") {
    return {
      kind: "pending_verification",
      message: result.message,
      canResend: true,
    };
  }

  if (result.status === "account_exists") {
    return {
      kind: "account_exists",
      message: result.message,
    };
  }

  return { kind: "form" };
}

export async function establishInviteSignupSession(
  auth: InviteSignupAuthClient,
  email: string,
  password: string,
  options?: { emailRedirectTo?: string },
): Promise<InviteSignupAuthResult> {
  const signUp = await auth.signUp({
    email,
    password,
    options: options?.emailRedirectTo
      ? { emailRedirectTo: options.emailRedirectTo }
      : undefined,
  });
  const userCreated = Boolean(signUp.data.user);

  if (signUp.data.session) {
    return { status: "session", session: signUp.data.session };
  }

  if (signUp.error) {
    logInviteSignupDevError("signUp", signUp.error);

    if (isEmailRateLimitError(signUp.error) && userCreated) {
      return {
        status: "pending_verification",
        accountCreated: true,
        reason: "email_rate_limit",
        message: INVITE_SIGNUP_EMAIL_RATE_LIMIT_MESSAGE,
      };
    }

    if (!isAccountAlreadyExistsError(signUp.error) && !userCreated) {
      return {
        status: "error",
        message: mapInviteSignupAuthError(signUp.error),
      };
    }
  }

  const signIn = await auth.signInWithPassword({ email, password });

  if (signIn.data.session) {
    return { status: "session", session: signIn.data.session };
  }

  if (signIn.error) {
    logInviteSignupDevError("signInWithPassword", signIn.error);
  }

  if (userCreated) {
    if (signUp.error && isEmailRateLimitError(signUp.error)) {
      return {
        status: "pending_verification",
        accountCreated: true,
        reason: "email_rate_limit",
        message: INVITE_SIGNUP_EMAIL_RATE_LIMIT_MESSAGE,
      };
    }

    return {
      status: "pending_verification",
      accountCreated: true,
      reason: "email_confirmation",
      message: INVITE_SIGNUP_PENDING_VERIFICATION_MESSAGE,
    };
  }

  if (signIn.error && isAccountAlreadyExistsError(signIn.error)) {
    return {
      status: "account_exists",
      message: INVITE_SIGNUP_ACCOUNT_EXISTS_MESSAGE,
    };
  }

  if (signUp.error && isAccountAlreadyExistsError(signUp.error)) {
    return {
      status: "account_exists",
      message: INVITE_SIGNUP_ACCOUNT_EXISTS_MESSAGE,
    };
  }

  return {
    status: "error",
    message: mapInviteSignupAuthError(signIn.error ?? signUp.error),
  };
}

export async function resendInviteSignupVerification(
  auth: Pick<InviteSignupAuthClient, "resend">,
  email: string,
  options?: { emailRedirectTo?: string },
): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const { error } = await auth.resend({
    type: "signup",
    email,
    options: options?.emailRedirectTo
      ? { emailRedirectTo: options.emailRedirectTo }
      : undefined,
  });

  if (error) {
    return { ok: false, message: mapInviteSignupResendError(error) };
  }

  return { ok: true, message: INVITE_SIGNUP_RESEND_SUCCESS_MESSAGE };
}
