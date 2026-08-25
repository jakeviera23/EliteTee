import { fetchMemberPortalAccess } from "./memberProfiles";
import {
  tryCompleteAuthenticatedInviteRedemption,
  type InviteRedemptionResult,
} from "./membershipInviteRedemption";

export const INVITE_ACTIVATION_SUCCESS_ALREADY_ACTIVE = "already_active" as const;
export const INVITE_ACTIVATION_SUCCESS_COMPLETED = "completed" as const;

export const INVITE_ACTIVATION_RECOVERY_MESSAGE =
  "Your login works, but we could not finish enabling EliteTee portal access yet. Open your invitation link and sign in there, or contact membership@elitetee.club.";

export const INVITE_ACTIVATION_EMAIL_MISMATCH_MESSAGE =
  "Your signed-in email does not match this invitation. Sign in with the approved email, or contact membership@elitetee.club.";

export const INVITE_ACTIVATION_INVALID_INVITE_MESSAGE =
  "This invitation is no longer valid. Contact membership@elitetee.club for help.";

export type InviteActivationSuccessReason =
  | typeof INVITE_ACTIVATION_SUCCESS_COMPLETED
  | typeof INVITE_ACTIVATION_SUCCESS_ALREADY_ACTIVE;

export type InviteActivationFailureReason =
  | "redemption_failed"
  | "email_mismatch"
  | "invalid_invite"
  | "no_approved_application"
  | "portal_access_unavailable";

export type InviteActivationResult =
  | {
      ok: true;
      reason: InviteActivationSuccessReason;
      redemption: InviteRedemptionResult | null;
    }
  | {
      ok: false;
      reason: InviteActivationFailureReason;
      message: string;
      redemption: InviteRedemptionResult | null;
    };

export type InviteActivationDeps = {
  tryCompleteAuthenticatedInviteRedemption: (
    options?: { inviteToken?: string },
  ) => Promise<InviteRedemptionResult>;
  fetchMemberPortalAccess: () => Promise<{ hasAccess: boolean }>;
};

const defaultDeps: InviteActivationDeps = {
  tryCompleteAuthenticatedInviteRedemption,
  fetchMemberPortalAccess,
};

function mapRedemptionFailureMessage(redemption: InviteRedemptionResult | null): {
  reason: InviteActivationFailureReason;
  message: string;
} {
  const raw = redemption?.error?.message?.toLowerCase() ?? "";
  const dataReason =
    redemption?.data && typeof redemption.data === "object"
      ? String((redemption.data as Record<string, unknown>).reason ?? "").toLowerCase()
      : "";

  if (raw.includes("email does not match") || dataReason.includes("email")) {
    return {
      reason: "email_mismatch",
      message: INVITE_ACTIVATION_EMAIL_MISMATCH_MESSAGE,
    };
  }

  if (
    raw.includes("invalid") ||
    raw.includes("expired") ||
    dataReason.includes("invalid") ||
    dataReason.includes("expired")
  ) {
    return {
      reason: "invalid_invite",
      message: INVITE_ACTIVATION_INVALID_INVITE_MESSAGE,
    };
  }

  if (
    dataReason.includes("no_approved_application") ||
    raw.includes("no approved") ||
    raw.includes("no_approved_application")
  ) {
    return {
      reason: "no_approved_application",
      message: INVITE_ACTIVATION_RECOVERY_MESSAGE,
    };
  }

  return {
    reason: "redemption_failed",
    message: INVITE_ACTIVATION_RECOVERY_MESSAGE,
  };
}

/**
 * After authentication, attempt invite/membership completion and only treat
 * the user as portal-ready when activation succeeds or they already have access.
 */
export async function finishInviteActivationAfterAuth(
  options?: { inviteToken?: string },
  deps: InviteActivationDeps = defaultDeps,
): Promise<InviteActivationResult> {
  const redemption = await deps.tryCompleteAuthenticatedInviteRedemption({
    inviteToken: options?.inviteToken,
  });

  if (redemption.completed) {
    return {
      ok: true,
      reason: INVITE_ACTIVATION_SUCCESS_COMPLETED,
      redemption,
    };
  }

  const { hasAccess } = await deps.fetchMemberPortalAccess();
  if (hasAccess) {
    return {
      ok: true,
      reason: INVITE_ACTIVATION_SUCCESS_ALREADY_ACTIVE,
      redemption,
    };
  }

  const failure = mapRedemptionFailureMessage(redemption);
  return {
    ok: false,
    reason: failure.reason,
    message: failure.message,
    redemption,
  };
}
