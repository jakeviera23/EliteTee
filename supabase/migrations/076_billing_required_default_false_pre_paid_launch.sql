-- Temporary charging-OFF default for new membership applications.
-- Paid launch can deliberately flip this back to true (see membershipChargingPolicy.ts).
--
-- Does NOT:
--   * alter membership_billing rows
--   * alter redeemed/active members
--   * change entitlement/payment gate RPCs
--   * enable Stripe charging

alter table public.membership_applications
  alter column billing_required set default false;

comment on column public.membership_applications.billing_required is
  'When true, activation requires Stripe entitlement or admin free exception. Default false while paid launch is OFF; set default true (and approve-time true) to re-enable charging.';
