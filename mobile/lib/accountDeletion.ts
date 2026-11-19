export const ACCOUNT_DELETION_CONFIRMATION = "DELETE";

export type AccountDeletionOutcome =
  | { kind: "deleted" }
  | { kind: "session_expired"; message: string }
  | { kind: "incomplete"; message: string }
  | { kind: "unavailable"; message: string }
  | { kind: "network"; message: string }
  | { kind: "unknown"; message: string };

export const ACCOUNT_DELETION_MESSAGES = {
  sessionExpired:
    "Your session has ended. Sign in again to finish deleting your account. If deletion already completed, your sign-in will no longer work.",
  incomplete:
    "We couldn't finish deleting your account. Some data may already be removed — please try again to complete deletion.",
  unavailable: "Account deletion is temporarily unavailable. Please try again later.",
  network: "We couldn't reach EliteTee. Check your connection and try again.",
  unknown:
    "Something went wrong while deleting your account. Please try again, or contact membership@elitetee.club.",
} as const;

export function isDeletionConfirmationValid(value: string) {
  return value.trim() === ACCOUNT_DELETION_CONFIRMATION;
}

/** Map the delete-account function response to a UI outcome without exposing server details. */
export function parseAccountDeletionResponse(
  status: number | null,
  body: unknown,
): AccountDeletionOutcome {
  const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  if (status !== null && status >= 200 && status < 300 && payload.ok === true) {
    return { kind: "deleted" };
  }

  if (status === 401) {
    return { kind: "session_expired", message: ACCOUNT_DELETION_MESSAGES.sessionExpired };
  }

  if (payload.error === "deletion_incomplete") {
    return { kind: "incomplete", message: ACCOUNT_DELETION_MESSAGES.incomplete };
  }

  if (status === 503 || payload.error === "unavailable") {
    return { kind: "unavailable", message: ACCOUNT_DELETION_MESSAGES.unavailable };
  }

  if (status === null) {
    return { kind: "network", message: ACCOUNT_DELETION_MESSAGES.network };
  }

  return { kind: "unknown", message: ACCOUNT_DELETION_MESSAGES.unknown };
}
