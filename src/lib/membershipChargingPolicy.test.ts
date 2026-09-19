import { describe, expect, it } from "vitest";
import {
  MEMBERSHIP_CHARGING_ENABLED,
  membershipInviteMayEnablePortal,
  resolveApprovalBillingFields,
  shouldInitializeStandardBillingOnApproval,
} from "./membershipChargingPolicy";

describe("membership charging policy (pre-paid launch)", () => {
  it("keeps charging disabled by default", () => {
    expect(MEMBERSHIP_CHARGING_ENABLED).toBe(false);
  });

  it("approves new members with billing_required=false while charging OFF", () => {
    expect(resolveApprovalBillingFields(false)).toEqual({
      billing_required: false,
      pricing_tier: "founding",
    });
    expect(shouldInitializeStandardBillingOnApproval(false)).toBe(false);
  });

  it("allows invite activation without Stripe entitlement when billing_required=false", () => {
    expect(
      membershipInviteMayEnablePortal({
        entitled: false,
        billingRequired: false,
      }),
    ).toBe(true);
  });

  it("keeps the payment gate when billing_required=true and not entitled", () => {
    expect(
      membershipInviteMayEnablePortal({
        entitled: false,
        billingRequired: true,
      }),
    ).toBe(false);
  });

  it("still allows activation when entitled even if billing_required=true", () => {
    expect(
      membershipInviteMayEnablePortal({
        entitled: true,
        billingRequired: true,
      }),
    ).toBe(true);
  });

  it("documents paid-launch approve behavior without enabling it now", () => {
    expect(resolveApprovalBillingFields(true)).toEqual({
      billing_required: true,
      pricing_tier: "standard",
    });
    expect(shouldInitializeStandardBillingOnApproval(true)).toBe(true);
  });
});
