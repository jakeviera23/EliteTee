import { describe, expect, it, vi } from "vitest";
import {
  finishInviteActivationAfterAuth,
  INVITE_ACTIVATION_EMAIL_MISMATCH_MESSAGE,
  INVITE_ACTIVATION_RECOVERY_MESSAGE,
  INVITE_ACTIVATION_SUCCESS_ALREADY_ACTIVE,
  INVITE_ACTIVATION_SUCCESS_COMPLETED,
} from "./inviteCompletion";
import type { InviteRedemptionResult } from "./membershipInviteRedemption";

function redemption(
  partial: Partial<InviteRedemptionResult> & Pick<InviteRedemptionResult, "completed">,
): InviteRedemptionResult {
  return {
    method: partial.method ?? "approved_application",
    data: partial.data ?? null,
    error: partial.error ?? null,
    completed: partial.completed,
  };
}

describe("finishInviteActivationAfterAuth", () => {
  it("completes Wes-class stuck accounts via pending membership redemption", async () => {
    const tryCompleteAuthenticatedInviteRedemption = vi.fn(async () =>
      redemption({
        completed: true,
        method: "approved_application",
        data: { completed: true, portal_access_enabled: true },
      }),
    );
    const fetchMemberPortalAccess = vi.fn(async () => ({
      hasAccess: false,
      profile: null,
      error: null,
    }));

    await expect(
      finishInviteActivationAfterAuth(
        { inviteToken: "wes-invite-token" },
        { tryCompleteAuthenticatedInviteRedemption, fetchMemberPortalAccess },
      ),
    ).resolves.toEqual({
      ok: true,
      reason: INVITE_ACTIVATION_SUCCESS_COMPLETED,
      redemption: expect.objectContaining({ completed: true, method: "approved_application" }),
    });

    expect(tryCompleteAuthenticatedInviteRedemption).toHaveBeenCalledWith({
      inviteToken: "wes-invite-token",
    });
    expect(fetchMemberPortalAccess).not.toHaveBeenCalled();
  });

  it("lets already-active members into the portal without requiring redemption", async () => {
    const tryCompleteAuthenticatedInviteRedemption = vi.fn(async () =>
      redemption({
        completed: false,
        data: { completed: false, reason: "no_approved_application" },
      }),
    );
    const fetchMemberPortalAccess = vi.fn(async () => ({
      hasAccess: true,
      profile: {
        id: "profile-1",
        portal_access_enabled: true,
        membership_status: "active",
        founding_member_number: "FM-001",
      },
      error: null,
    }));

    await expect(
      finishInviteActivationAfterAuth(undefined, {
        tryCompleteAuthenticatedInviteRedemption,
        fetchMemberPortalAccess,
      }),
    ).resolves.toEqual({
      ok: true,
      reason: INVITE_ACTIVATION_SUCCESS_ALREADY_ACTIVE,
      redemption: expect.objectContaining({ completed: false }),
    });
  });

  it("blocks unactivated users instead of routing them into a pending dead end", async () => {
    const tryCompleteAuthenticatedInviteRedemption = vi.fn(async () =>
      redemption({
        completed: false,
        data: { completed: false, reason: "no_approved_application" },
      }),
    );
    const fetchMemberPortalAccess = vi.fn(async () => ({
      hasAccess: false,
      profile: null,
      error: null,
    }));

    await expect(
      finishInviteActivationAfterAuth(undefined, {
        tryCompleteAuthenticatedInviteRedemption,
        fetchMemberPortalAccess,
      }),
    ).resolves.toEqual({
      ok: false,
      reason: "no_approved_application",
      message: INVITE_ACTIVATION_RECOVERY_MESSAGE,
      redemption: expect.objectContaining({ completed: false }),
    });
  });

  it("surfaces email-mismatch failures without granting portal access", async () => {
    const tryCompleteAuthenticatedInviteRedemption = vi.fn(async () =>
      redemption({
        completed: false,
        method: "invite_token",
        error: { message: "Authenticated email does not match invite email" },
      }),
    );
    const fetchMemberPortalAccess = vi.fn(async () => ({
      hasAccess: false,
      profile: null,
      error: null,
    }));

    await expect(
      finishInviteActivationAfterAuth(
        { inviteToken: "other-invite" },
        { tryCompleteAuthenticatedInviteRedemption, fetchMemberPortalAccess },
      ),
    ).resolves.toEqual({
      ok: false,
      reason: "email_mismatch",
      message: INVITE_ACTIVATION_EMAIL_MISMATCH_MESSAGE,
      redemption: expect.objectContaining({ completed: false }),
    });
  });
});
