import type { MembershipApplicationRecord } from "../types/membershipApplication";
import type { AdminMemberRow } from "./memberProfiles";

/** Invite links expire 30 days after token creation (matches RPC logic). */
export const INVITE_VALIDITY_DAYS = 30;

/** Flag approved applicants still awaiting activation after this many days. */
export const NEEDS_ATTENTION_AWAITING_DAYS = 7;

export type DetailedInviteStatus = "valid" | "expired" | "missing" | "redeemed";

export type OnboardingStepState = "complete" | "current" | "incomplete" | "unknown";

export type OnboardingStep = {
  key: string;
  label: string;
  state: OnboardingStepState;
  detail?: string;
};

export type NeedsAttentionReason =
  | "invite_missing"
  | "invite_expired"
  | "portal_anomaly"
  | "long_awaiting";

export type AdminOnboardingSnapshot = {
  inviteStatus: DetailedInviteStatus;
  inviteCreatedAt: string | null;
  inviteExpiresAt: string | null;
  inviteRedeemedAt: string | null;
  profileLinked: boolean;
  portalAccessEnabled: boolean;
  membershipActivated: boolean;
  needsAttention: boolean;
  attentionReasons: NeedsAttentionReason[];
  attentionSummary: string;
  steps: OnboardingStep[];
};

export type AdminOnboardingProfile = Pick<
  AdminMemberRow,
  "id" | "email" | "user_id" | "portal_access_enabled"
>;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function parseTimestamp(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

function addDays(iso: string, days: number): string {
  const ms = parseTimestamp(iso);
  if (ms === null) return "";
  return new Date(ms + days * 24 * 60 * 60 * 1000).toISOString();
}

function daysBetween(fromIso: string, toMs: number): number {
  const fromMs = parseTimestamp(fromIso);
  if (fromMs === null) return 0;
  return Math.floor((toMs - fromMs) / (24 * 60 * 60 * 1000));
}

export function getDetailedInviteStatus(
  application: Pick<
    MembershipApplicationRecord,
    "invite_token" | "invitation_link" | "invite_token_created_at" | "invite_redeemed_at"
  >,
  nowMs: number = Date.now(),
): DetailedInviteStatus {
  if (application.invite_redeemed_at) return "redeemed";

  const hasInvite = Boolean(application.invite_token?.trim() || application.invitation_link?.trim());
  if (!hasInvite) return "missing";

  const createdMs = parseTimestamp(application.invite_token_created_at);
  if (createdMs !== null) {
    const expiresMs = createdMs + INVITE_VALIDITY_DAYS * 24 * 60 * 60 * 1000;
    if (nowMs > expiresMs) return "expired";
  }

  return "valid";
}

export function resolveOnboardingProfile(
  application: Pick<MembershipApplicationRecord, "email" | "member_profile_id">,
  profilesById: Map<string, AdminOnboardingProfile>,
  profilesByEmail: Map<string, AdminOnboardingProfile>,
): AdminOnboardingProfile | null {
  if (application.member_profile_id) {
    const byId = profilesById.get(application.member_profile_id);
    if (byId) return byId;
  }

  return profilesByEmail.get(normalizeEmail(application.email)) ?? null;
}

export function buildOnboardingProfileMaps(profiles: AdminOnboardingProfile[]) {
  const profilesById = new Map<string, AdminOnboardingProfile>();
  const profilesByEmail = new Map<string, AdminOnboardingProfile>();

  for (const profile of profiles) {
    profilesById.set(profile.id, profile);
    profilesByEmail.set(normalizeEmail(profile.email), profile);
  }

  return { profilesById, profilesByEmail };
}

function inviteStatusLabel(status: DetailedInviteStatus): string {
  switch (status) {
    case "valid":
      return "Valid";
    case "expired":
      return "Expired";
    case "missing":
      return "Missing";
    case "redeemed":
      return "Redeemed";
  }
}

function attentionReasonLabel(reason: NeedsAttentionReason): string {
  switch (reason) {
    case "invite_missing":
      return "Invite link missing";
    case "invite_expired":
      return "Invite expired";
    case "portal_anomaly":
      return "Profile linked but portal access disabled";
    case "long_awaiting":
      return `Awaiting activation ${NEEDS_ATTENTION_AWAITING_DAYS}+ days`;
  }
}

export function deriveNeedsAttentionReasons(input: {
  application: Pick<
    MembershipApplicationRecord,
    "reviewed_at" | "applied_at" | "invite_token_created_at" | "invite_redeemed_at"
  >;
  inviteStatus: DetailedInviteStatus;
  profileLinked: boolean;
  portalAccessEnabled: boolean;
  membershipActivated: boolean;
  nowMs?: number;
}): NeedsAttentionReason[] {
  const reasons: NeedsAttentionReason[] = [];
  const nowMs = input.nowMs ?? Date.now();

  if (input.inviteStatus === "missing") {
    reasons.push("invite_missing");
  }

  if (input.inviteStatus === "expired") {
    reasons.push("invite_expired");
  }

  if (input.profileLinked && !input.portalAccessEnabled) {
    reasons.push("portal_anomaly");
  }

  if (!input.membershipActivated) {
    const anchor =
      input.application.reviewed_at ??
      input.application.invite_token_created_at ??
      input.application.applied_at;
    if (anchor && daysBetween(anchor, nowMs) >= NEEDS_ATTENTION_AWAITING_DAYS) {
      reasons.push("long_awaiting");
    }
  }

  return reasons;
}

export function deriveAdminOnboardingSnapshot(
  application: MembershipApplicationRecord,
  profile: AdminOnboardingProfile | null,
  nowMs: number = Date.now(),
): AdminOnboardingSnapshot {
  const inviteStatus = getDetailedInviteStatus(application, nowMs);
  const profileLinked = Boolean(profile?.user_id);
  const portalAccessEnabled = Boolean(profile?.portal_access_enabled);
  const membershipActivated =
    Boolean(application.invite_redeemed_at) || (profileLinked && portalAccessEnabled);

  const inviteCreatedAt = application.invite_token_created_at;
  const inviteExpiresAt =
    inviteCreatedAt && inviteStatus !== "redeemed" && inviteStatus !== "missing"
      ? addDays(inviteCreatedAt, INVITE_VALIDITY_DAYS)
      : null;

  const attentionReasons = deriveNeedsAttentionReasons({
    application,
    inviteStatus,
    profileLinked,
    portalAccessEnabled,
    membershipActivated,
    nowMs,
  });

  const steps: OnboardingStep[] = [
    {
      key: "applied",
      label: "Applied",
      state: "complete",
      detail: application.applied_at ? undefined : "—",
    },
    {
      key: "approved",
      label: "Approved",
      state: application.status === "approved" ? "complete" : "incomplete",
    },
    {
      key: "invite",
      label: "Invite",
      state:
        inviteStatus === "redeemed" || inviteStatus === "valid"
          ? "complete"
          : inviteStatus === "expired" || inviteStatus === "missing"
            ? "current"
            : "incomplete",
      detail: inviteStatusLabel(inviteStatus),
    },
    {
      key: "auth",
      label: "Auth",
      state: "unknown",
      detail: "Unknown",
    },
    {
      key: "email",
      label: "Email",
      state: "unknown",
      detail: "Unknown",
    },
    {
      key: "activated",
      label: "Activated",
      state: membershipActivated ? "complete" : "incomplete",
    },
  ];

  return {
    inviteStatus,
    inviteCreatedAt,
    inviteExpiresAt,
    inviteRedeemedAt: application.invite_redeemed_at,
    profileLinked,
    portalAccessEnabled,
    membershipActivated,
    needsAttention: attentionReasons.length > 0,
    attentionReasons,
    attentionSummary: attentionReasons.map(attentionReasonLabel).join(" · "),
    steps,
  };
}

export function computeNeedsAttentionCount(
  applications: MembershipApplicationRecord[],
  profilesById: Map<string, AdminOnboardingProfile>,
  profilesByEmail: Map<string, AdminOnboardingProfile>,
  nowMs: number = Date.now(),
): number {
  let count = 0;

  for (const application of applications) {
    if (application.status !== "approved") continue;

    const profile = resolveOnboardingProfile(application, profilesById, profilesByEmail);
    const snapshot = deriveAdminOnboardingSnapshot(application, profile, nowMs);
    if (snapshot.needsAttention) count += 1;
  }

  return count;
}

export function filterNeedsAttentionApplications<T extends MembershipApplicationRecord>(
  applications: T[],
  profilesById: Map<string, AdminOnboardingProfile>,
  profilesByEmail: Map<string, AdminOnboardingProfile>,
  nowMs: number = Date.now(),
): T[] {
  return applications.filter((application) => {
    if (application.status !== "approved") return false;
    const profile = resolveOnboardingProfile(application, profilesById, profilesByEmail);
    return deriveAdminOnboardingSnapshot(application, profile, nowMs).needsAttention;
  });
}
