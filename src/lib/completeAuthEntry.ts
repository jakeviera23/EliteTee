import type { EmailOtpType, Session } from "@supabase/supabase-js";
import {
  AUTH_CALLBACK_EXPIRED_MESSAGE,
  clearCapturedAuthCallback,
  getAuthCallbackErrorMessage,
  getCapturedAuthCallback,
  hasAuthCallbackWork,
  isAuthEmailOtpType,
  isPasswordRecoveryCallback,
  type AuthCallbackParams,
} from "./authCallbackParams";
import { finishInviteActivationAfterAuth, type InviteActivationResult } from "./inviteCompletion";
import { supabase } from "./supabase";

export type AuthEntryResult =
  | { kind: "none" }
  | { kind: "portal" }
  | { kind: "recovery" }
  | { kind: "login_error"; message: string };

export type AuthEntryClient = {
  verifyOtp: (params: {
    token_hash: string;
    type: EmailOtpType;
  }) => Promise<{
    data: { session: Session | null };
    error: { message?: string } | null;
  }>;
  getSession: () => Promise<{
    data: { session: Session | null };
    error: { message?: string } | null;
  }>;
};

export type AuthEntryActivation = {
  finishInviteActivationAfterAuth: (
    options?: { inviteToken?: string },
  ) => Promise<InviteActivationResult>;
};

let inFlight: Promise<AuthEntryResult> | null = null;

function asAuthEntryClient(): AuthEntryClient | null {
  if (!supabase) return null;
  return supabase.auth;
}

const defaultActivation: AuthEntryActivation = {
  finishInviteActivationAfterAuth,
};

export async function completeAuthEntryFromCallback(
  auth: AuthEntryClient | null = asAuthEntryClient(),
  snapshot: AuthCallbackParams | null = getCapturedAuthCallback(),
  activation: AuthEntryActivation = defaultActivation,
): Promise<AuthEntryResult> {
  if (!inFlight) {
    inFlight = runCompleteAuthEntry(auth, snapshot, activation);
  }
  return inFlight;
}

/** Clear sticky callback capture + cached completion so recovery cannot re-fire. */
export function consumeAuthEntryCallback() {
  clearCapturedAuthCallback();
  inFlight = null;
}

export function resetAuthEntryInFlightForTests() {
  inFlight = null;
}

/**
 * Enter set-password only with genuine recovery proof.
 * Router-verified recovery from AuthEntryHandler, or a PASSWORD_RECOVERY auth event.
 * A bare ?recovery=1 query + any session is not enough.
 */
export function shouldEnterSetPasswordMode(input: {
  recoveryVerifiedFromRouter?: boolean;
  passwordRecoveryEvent?: boolean;
}): boolean {
  return Boolean(input.recoveryVerifiedFromRouter || input.passwordRecoveryEvent);
}

async function runCompleteAuthEntry(
  auth: AuthEntryClient | null,
  snapshot: AuthCallbackParams | null,
  activation: AuthEntryActivation,
): Promise<AuthEntryResult> {
  if (!snapshot || !hasAuthCallbackWork(snapshot)) {
    return { kind: "none" };
  }

  const callbackError = getAuthCallbackErrorMessage(snapshot);
  if (!auth) {
    return {
      kind: "login_error",
      message: callbackError ?? AUTH_CALLBACK_EXPIRED_MESSAGE,
    };
  }

  if (snapshot.tokenHash) {
    const otpType = isAuthEmailOtpType(snapshot.type) ? snapshot.type : "email";
    const { error } = await auth.verifyOtp({
      token_hash: snapshot.tokenHash,
      type: otpType,
    });

    if (error) {
      return {
        kind: "login_error",
        message: AUTH_CALLBACK_EXPIRED_MESSAGE,
      };
    }
  }

  const { data, error } = await auth.getSession();
  if (error) {
    return {
      kind: "login_error",
      message: callbackError ?? AUTH_CALLBACK_EXPIRED_MESSAGE,
    };
  }

  if (isPasswordRecoveryCallback(snapshot) && data.session) {
    return { kind: "recovery" };
  }

  if (data.session) {
    const result = await activation.finishInviteActivationAfterAuth();
    if (result.ok) {
      return { kind: "portal" };
    }

    return {
      kind: "login_error",
      message: result.message,
    };
  }

  return {
    kind: "login_error",
    message: callbackError ?? AUTH_CALLBACK_EXPIRED_MESSAGE,
  };
}
