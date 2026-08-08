import AsyncStorage from "@react-native-async-storage/async-storage";
import { requireSupabase } from "../supabase";

export const PENDING_INVITE_TOKEN_STORAGE_KEY = "elitetee_pending_invite_token";

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

export async function storePendingInviteToken(token: string) {
  const normalized = token.trim();
  if (!normalized) return;
  await AsyncStorage.setItem(PENDING_INVITE_TOKEN_STORAGE_KEY, normalized);
}

export async function readPendingInviteToken() {
  const token = (await AsyncStorage.getItem(PENDING_INVITE_TOKEN_STORAGE_KEY))?.trim();
  return token || null;
}

export async function clearPendingInviteToken() {
  await AsyncStorage.removeItem(PENDING_INVITE_TOKEN_STORAGE_KEY);
}

async function completeMembershipInvite(token: string) {
  const client = requireSupabase();
  return client.rpc("complete_membership_invite", { p_token: token.trim() });
}

async function completePendingMembershipInviteForUser() {
  const client = requireSupabase();
  return client.rpc("complete_pending_membership_invite_for_user");
}

export async function tryCompleteAuthenticatedInviteRedemption(options?: {
  inviteToken?: string;
}) {
  const explicitToken = options?.inviteToken?.trim() || (await readPendingInviteToken());

  if (explicitToken) {
    const { data, error } = await completeMembershipInvite(explicitToken);
    if (!error && didCompleteInviteRedemption(data)) {
      await clearPendingInviteToken();
      return { completed: true, method: "invite_token" as const, error: null };
    }

    if (error) {
      const message = error.message?.toLowerCase() ?? "";
      const alreadyUsed =
        message.includes("already used") ||
        message.includes("already_redeemed") ||
        message.includes("invalid or already used");

      if (!alreadyUsed) {
        return { completed: false, method: "invite_token" as const, error };
      }
    }
  }

  const { data, error } = await completePendingMembershipInviteForUser();
  if (!error && didCompleteInviteRedemption(data)) {
    await clearPendingInviteToken();
    return { completed: true, method: "approved_application" as const, error: null };
  }

  return {
    completed: false,
    method: explicitToken ? ("invite_token" as const) : ("approved_application" as const),
    error,
  };
}
