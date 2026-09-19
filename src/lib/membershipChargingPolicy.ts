/**
 * Membership charging policy for approvals / application defaults.
 *
 * While MEMBERSHIP_CHARGING_ENABLED is false (current product state):
 *   - new applications/approvals must use billing_required = false
 *   - do not initialize unpaid "standard" billing rows on approve
 *   - founding approvals keep pricing_tier = founding
 *
 * Paid launch (deliberate switch):
 *   1. Set MEMBERSHIP_CHARGING_ENABLED = true
 *   2. Apply a follow-up migration: alter billing_required default back to true
 *   3. Approve path will then write billing_required=true + pricing_tier=standard
 *      and may initialize standard billing (separate billing-branch helpers).
 *
 * Keep the SQL entitlement gate (membership_invite_may_enable_portal) unchanged.
 */

export const MEMBERSHIP_CHARGING_ENABLED = false;

export type MembershipApprovalBillingFields = {
  billing_required: boolean;
  pricing_tier: "founding" | "standard";
};

/**
 * Fields written on approve. Explicit values prevent regressions if the DB
 * column default diverges from the product flag.
 */
export function resolveApprovalBillingFields(
  chargingEnabled: boolean = MEMBERSHIP_CHARGING_ENABLED,
): MembershipApprovalBillingFields {
  if (chargingEnabled) {
    return {
      billing_required: true,
      pricing_tier: "standard",
    };
  }

  return {
    billing_required: false,
    pricing_tier: "founding",
  };
}

export function shouldInitializeStandardBillingOnApproval(
  chargingEnabled: boolean = MEMBERSHIP_CHARGING_ENABLED,
): boolean {
  return chargingEnabled;
}

/**
 * Mirrors SQL public.membership_invite_may_enable_portal for client/tests.
 * Entitled OR billing_required=false may enable portal access.
 */
export function membershipInviteMayEnablePortal(input: {
  entitled: boolean;
  billingRequired: boolean;
}): boolean {
  if (input.entitled) return true;
  if (!input.billingRequired) return true;
  return false;
}
