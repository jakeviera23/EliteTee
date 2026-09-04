export type MobileAuthErrorKind =
  | "invalid_credentials"
  | "email_not_confirmed"
  | "rate_limited"
  | "network"
  | "unknown";

export type MobileAuthError = {
  kind: MobileAuthErrorKind;
  message: string;
};

const COPY: Record<MobileAuthErrorKind, string> = {
  invalid_credentials: "Email or password is incorrect.",
  email_not_confirmed: "Confirm your email before signing in. Check your inbox for the EliteTee link.",
  rate_limited: "Too many attempts. Please wait a moment and try again.",
  network: "Unable to reach EliteTee. Check your connection and try again.",
  unknown: "Sign in could not be completed. Please try again.",
};

function asErrorMessage(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message || "";
  if (typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : "";
  }
  return "";
}

function asErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : null;
}

export function classifyAuthError(error: unknown): MobileAuthError {
  const message = asErrorMessage(error);
  const lower = message.toLowerCase();
  const status = asErrorStatus(error);

  if (
    status === 0 ||
    lower.includes("network request failed") ||
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("internet connection") ||
    lower.includes("offline")
  ) {
    return { kind: "network", message: COPY.network };
  }

  if (
    status === 429 ||
    lower.includes("rate limit") ||
    lower.includes("too many requests") ||
    lower.includes("over_request_rate_limit")
  ) {
    return { kind: "rate_limited", message: COPY.rate_limited };
  }

  if (lower.includes("email not confirmed") || lower.includes("not confirmed")) {
    return { kind: "email_not_confirmed", message: COPY.email_not_confirmed };
  }

  if (
    lower.includes("invalid login") ||
    lower.includes("invalid credentials") ||
    lower.includes("invalid email or password")
  ) {
    return { kind: "invalid_credentials", message: COPY.invalid_credentials };
  }

  return { kind: "unknown", message: COPY.unknown };
}

export function logAuthError(context: string, error: unknown) {
  const details = {
    message: asErrorMessage(error),
    status: asErrorStatus(error),
    name: error instanceof Error ? error.name : undefined,
  };
  console.warn(`[mobile:auth] ${context}`, details);
}
