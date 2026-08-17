import {
  completeMembershipInvite,
  completePendingMembershipInviteForUser,
} from "./membershipInvites";

export const PENDING_INVITE_TOKEN_STORAGE_KEY = "elitetee_pending_invite_token";

function inviteTokenStorage(): Storage | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    try {
      return window.sessionStorage;
    } catch {
      return null;
    }
  }
}

export function storePendingInviteToken(token: string) {
  const normalized = token.trim();
  const storage = inviteTokenStorage();
  if (!normalized || !storage) return;
  storage.setItem(PENDING_INVITE_TOKEN_STORAGE_KEY, normalized);
}

export function readPendingInviteToken(): string | null {
  const storage = inviteTokenStorage();
  const fromPreferred = storage?.getItem(PENDING_INVITE_TOKEN_STORAGE_KEY)?.trim() || null;
  if (fromPreferred) return fromPreferred;

  if (typeof window === "undefined") return null;

  try {
    return window.sessionStorage.getItem(PENDING_INVITE_TOKEN_STORAGE_KEY)?.trim() || null;
  } catch {
    return null;
  }
}

export function clearPendingInviteToken() {
  const storage = inviteTokenStorage();
  if (!storage) return;
  storage.removeItem(PENDING_INVITE_TOKEN_STORAGE_KEY);
  try {
    window.sessionStorage.removeItem(PENDING_INVITE_TOKEN_STORAGE_KEY);
  } catch {
    // Older tabs may have stored the token only in sessionStorage.
  }
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
