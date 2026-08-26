export const AUTH_CALLBACK_EXPIRED_MESSAGE =
  "This access link is invalid or has expired. Sign in with your password, or request a new email.";

export type AuthEmailOtpType =
  | "signup"
  | "invite"
  | "magiclink"
  | "recovery"
  | "email"
  | "email_change";

export type AuthCallbackParams = {
  accessToken: string | null;
  refreshToken: string | null;
  code: string | null;
  tokenHash: string | null;
  type: string | null;
  error: string | null;
  errorCode: string | null;
  errorDescription: string | null;
};

function firstValue(params: URLSearchParams, key: string): string | null {
  const value = params.get(key)?.trim();
  return value || null;
}

function mergeSearchParams(...groups: URLSearchParams[]): URLSearchParams {
  const merged = new URLSearchParams();
  for (const group of groups) {
    group.forEach((value, key) => {
      if (!merged.has(key) && value.trim()) {
        merged.set(key, value);
      }
    });
  }
  return merged;
}

export function parseAuthCallbackParams(href: string): AuthCallbackParams {
  let url: URL;
  try {
    url = new URL(href, "https://www.elitetee.club");
  } catch {
    return {
      accessToken: null,
      refreshToken: null,
      code: null,
      tokenHash: null,
      type: null,
      error: null,
      errorCode: null,
      errorDescription: null,
    };
  }

  const fromQuery = url.searchParams;
  const fromHash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const params = mergeSearchParams(fromHash, fromQuery);

  return {
    accessToken: firstValue(params, "access_token"),
    refreshToken: firstValue(params, "refresh_token"),
    code: firstValue(params, "code"),
    tokenHash: firstValue(params, "token_hash"),
    type: firstValue(params, "type"),
    error: firstValue(params, "error"),
    errorCode: firstValue(params, "error_code"),
    errorDescription: firstValue(params, "error_description"),
  };
}

export function isAuthEmailOtpType(value: string | null): value is AuthEmailOtpType {
  return (
    value === "signup" ||
    value === "invite" ||
    value === "magiclink" ||
    value === "recovery" ||
    value === "email" ||
    value === "email_change"
  );
}

export function hasAuthCallbackWork(params: AuthCallbackParams): boolean {
  return Boolean(
    params.accessToken ||
      params.refreshToken ||
      params.code ||
      params.tokenHash ||
      params.error ||
      params.errorCode ||
      params.errorDescription ||
      params.type,
  );
}

export function isPasswordRecoveryCallback(params: AuthCallbackParams): boolean {
  return params.type === "recovery";
}

export function getAuthCallbackErrorMessage(params: AuthCallbackParams): string | null {
  if (!params.error && !params.errorCode && !params.errorDescription) {
    return null;
  }

  const combined = `${params.errorCode ?? ""} ${params.errorDescription ?? ""} ${params.error ?? ""}`.toLowerCase();
  if (
    combined.includes("otp_expired") ||
    combined.includes("expired") ||
    combined.includes("invalid") ||
    combined.includes("access_denied")
  ) {
    return AUTH_CALLBACK_EXPIRED_MESSAGE;
  }

  return AUTH_CALLBACK_EXPIRED_MESSAGE;
}

let capturedAuthCallback: AuthCallbackParams | null = null;

export function captureAuthCallbackFromLocation(href: string): AuthCallbackParams {
  capturedAuthCallback = parseAuthCallbackParams(href);
  return capturedAuthCallback;
}

export function getCapturedAuthCallback(): AuthCallbackParams | null {
  return capturedAuthCallback;
}

export function clearCapturedAuthCallback() {
  capturedAuthCallback = null;
}

export function capturedAuthCallbackHasWork(): boolean {
  return capturedAuthCallback ? hasAuthCallbackWork(capturedAuthCallback) : false;
}
