import {
  completeMembershipInvite,
  completePendingMembershipInviteForUser,
} from "./membershipInvites";

export const PENDING_INVITE_TOKEN_STORAGE_KEY = "elitetee_pending_invite_token";

export function storePendingInviteToken(token: string) {
  const normalized = token.trim();
  if (!normalized || typeof window === "undefined") return;
  window.sessionStorage.setItem(PENDING_INVITE_TOKEN_STORAGE_KEY, normalized);
}

export function readPendingInviteToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = window.sessionStorage.getItem(PENDING_INVITE_TOKEN_STORAGE_KEY)?.trim();
  return token || null;
}

export function clearPendingInviteToken() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(PENDING_INVITE_TOKEN_STORAGE_KEY);
}

export function didCompleteInviteRedemption(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;

  const row = data as Record<string, unknown>;
  return (
    row.portal_access_enabled === true ||
    row.completed === true ||
    row.already_redeemed === true ||
    row.already_active === true
  );
}

export async function tryCompleteAuthenticatedInviteRedemption(options?: {
  inviteToken?: string;
}) {
  const explicitToken = options?.inviteToken?.trim() || readPendingInviteToken();

  if (explicitToken) {
    const { data, error } = await completeMembershipInvite(explicitToken);
    if (!error && didCompleteInviteRedemption(data)) {
      clearPendingInviteToken();
      return { completed: true, method: "invite_token" as const, data, error: null };
    }

    if (error) {
      const message = error.message?.toLowerCase() ?? "";
      const alreadyUsed =
        message.includes("already used") ||
        message.includes("already_redeemed") ||
        message.includes("invalid or already used");

      if (!alreadyUsed) {
        return { completed: false, method: "invite_token" as const, data: null, error };
      }
    }
  }

  const { data, error } = await completePendingMembershipInviteForUser();
  if (!error && didCompleteInviteRedemption(data)) {
    clearPendingInviteToken();
    return { completed: true, method: "approved_application" as const, data, error: null };
  }

  return {
    completed: false,
    method: explicitToken ? ("invite_token" as const) : ("approved_application" as const),
    data,
    error,
  };
}
