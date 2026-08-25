import { describe, expect, it } from "vitest";
import type { MembershipApplicationRecord } from "../types/membershipApplication";
import {
  NEEDS_ATTENTION_AWAITING_DAYS,
  buildOnboardingProfileMaps,
  computeNeedsAttentionCount,
  deriveAdminOnboardingSnapshot,
  deriveNeedsAttentionReasons,
  filterNeedsAttentionApplications,
  getDetailedInviteStatus,
  resolveOnboardingProfile,
} from "./adminOnboarding";
import type { AdminOnboardingProfile } from "./adminOnboarding";

const NOW = Date.parse("2026-08-25T12:00:00.000Z");

function application(
  overrides: Partial<MembershipApplicationRecord> & Pick<MembershipApplicationRecord, "id">,
): MembershipApplicationRecord {
  return {
    full_name: "Jordan Lee",
    email: "jordan@example.com",
    location: "Florida",
    home_club: "Seminole",
    golf_love: "Architecture",
    why_join: "Community",
    status: "approved",
    applied_at: "2026-07-01T12:00:00.000Z",
    reviewed_at: "2026-07-02T12:00:00.000Z",
    reviewed_by_email: null,
    decline_reason: null,
    member_profile_id: "profile-1",
    founding_member_number: "FM-001",
    invitation_user_id: null,
    invitation_email_draft: null,
    invitation_link: null,
    invite_token: "token",
    invite_token_created_at: "2026-08-01T12:00:00.000Z",
    invite_redeemed_at: null,
    referrer_member_user_id: null,
    referral_code_used: null,
    referral_captured_at: null,
    created_at: "2026-07-01T12:00:00.000Z",
    updated_at: "2026-07-01T12:00:00.000Z",
    ...overrides,
  };
}

function profile(overrides: Partial<AdminOnboardingProfile> = {}): AdminOnboardingProfile {
  return {
    id: "profile-1",
    email: "jordan@example.com",
    user_id: null,
    portal_access_enabled: false,
    ...overrides,
  };
}

describe("getDetailedInviteStatus", () => {
  it("classifies redeemed, valid, expired, and missing invites", () => {
    expect(
      getDetailedInviteStatus(
        application({
          id: "1",
          invite_redeemed_at: "2026-08-10T12:00:00.000Z",
        }),
        NOW,
      ),
    ).toBe("redeemed");

    expect(
      getDetailedInviteStatus(
        application({
          id: "2",
          invite_token: "abc",
          invite_token_created_at: "2026-08-01T12:00:00.000Z",
        }),
        NOW,
      ),
    ).toBe("valid");

    expect(
      getDetailedInviteStatus(
        application({
          id: "3",
          invite_token: "abc",
          invite_token_created_at: "2026-06-01T12:00:00.000Z",
        }),
        NOW,
      ),
    ).toBe("expired");

    expect(
      getDetailedInviteStatus(
        application({
          id: "4",
          invite_token: null,
          invitation_link: null,
        }),
        NOW,
      ),
    ).toBe("missing");
  });
});

describe("deriveNeedsAttentionReasons", () => {
  it("flags missing invite, expired invite, portal anomaly, and long awaiting", () => {
    expect(
      deriveNeedsAttentionReasons({
        application: application({ id: "1", invite_token: null, invitation_link: null }),
        inviteStatus: "missing",
        profileLinked: false,
        portalAccessEnabled: false,
        membershipActivated: false,
        nowMs: NOW,
      }),
    ).toContain("invite_missing");

    expect(
      deriveNeedsAttentionReasons({
        application: application({
          id: "2",
          invite_token_created_at: "2026-06-01T12:00:00.000Z",
        }),
        inviteStatus: "expired",
        profileLinked: false,
        portalAccessEnabled: false,
        membershipActivated: false,
        nowMs: NOW,
      }),
    ).toEqual(expect.arrayContaining(["invite_expired", "long_awaiting"]));

    expect(
      deriveNeedsAttentionReasons({
        application: application({ id: "3" }),
        inviteStatus: "valid",
        profileLinked: true,
        portalAccessEnabled: false,
        membershipActivated: false,
        nowMs: NOW,
      }),
    ).toContain("portal_anomaly");

    expect(
      deriveNeedsAttentionReasons({
        application: application({
          id: "4",
          reviewed_at: "2026-08-20T12:00:00.000Z",
        }),
        inviteStatus: "valid",
        profileLinked: false,
        portalAccessEnabled: false,
        membershipActivated: false,
        nowMs: NOW,
      }),
    ).not.toContain("long_awaiting");

    expect(
      deriveNeedsAttentionReasons({
        application: application({
          id: "5",
          reviewed_at: "2026-08-10T12:00:00.000Z",
        }),
        inviteStatus: "valid",
        profileLinked: false,
        portalAccessEnabled: false,
        membershipActivated: false,
        nowMs: NOW,
      }),
    ).toContain("long_awaiting");
  });
});

describe("deriveAdminOnboardingSnapshot", () => {
  it("marks auth and email as unknown and derives activation from profile + invite", () => {
    const snapshot = deriveAdminOnboardingSnapshot(
      application({ id: "1", invite_redeemed_at: "2026-08-20T12:00:00.000Z" }),
      profile({ user_id: "user-1", portal_access_enabled: true }),
      NOW,
    );

    expect(snapshot.membershipActivated).toBe(true);
    expect(snapshot.needsAttention).toBe(false);
    expect(snapshot.steps.find((step) => step.key === "auth")).toEqual(
      expect.objectContaining({ state: "unknown", detail: "Unknown" }),
    );
    expect(snapshot.steps.find((step) => step.key === "email")).toEqual(
      expect.objectContaining({ state: "unknown", detail: "Unknown" }),
    );
  });

  it("surfaces Wes-class stuck state as needs attention", () => {
    const snapshot = deriveAdminOnboardingSnapshot(
      application({
        id: "wes",
        email: "weskpatt@gmail.com",
        member_profile_id: "profile-wes",
        reviewed_at: "2026-07-01T12:00:00.000Z",
        invite_token_created_at: "2026-08-01T12:00:00.000Z",
      }),
      profile({ id: "profile-wes", email: "weskpatt@gmail.com", user_id: null }),
      NOW,
    );

    expect(snapshot.inviteStatus).toBe("valid");
    expect(snapshot.profileLinked).toBe(false);
    expect(snapshot.portalAccessEnabled).toBe(false);
    expect(snapshot.needsAttention).toBe(true);
    expect(snapshot.attentionReasons).toContain("long_awaiting");
  });
});

describe("profile maps and filters", () => {
  it("joins profiles by member_profile_id or email", () => {
    const maps = buildOnboardingProfileMaps([
      profile({ id: "profile-1", email: "jordan@example.com" }),
    ]);

    expect(
      resolveOnboardingProfile(
        application({ id: "1", member_profile_id: "profile-1" }),
        maps.profilesById,
        maps.profilesByEmail,
      )?.id,
    ).toBe("profile-1");

    expect(
      resolveOnboardingProfile(
        application({ id: "2", member_profile_id: null, email: "Jordan@Example.com" }),
        maps.profilesById,
        maps.profilesByEmail,
      )?.id,
    ).toBe("profile-1");
  });

  it("counts and filters needs-attention approved applicants", () => {
    const apps = [
      application({ id: "1", invite_redeemed_at: "2026-08-20T12:00:00.000Z" }),
      application({
        id: "2",
        email: "stuck@example.com",
        member_profile_id: "profile-2",
        reviewed_at: "2026-07-01T12:00:00.000Z",
      }),
    ];
    const maps = buildOnboardingProfileMaps([
      profile({ id: "profile-1", user_id: "user-1", portal_access_enabled: true }),
      profile({ id: "profile-2", email: "stuck@example.com", user_id: null }),
    ]);

    expect(computeNeedsAttentionCount(apps, maps.profilesById, maps.profilesByEmail, NOW)).toBe(1);
    expect(
      filterNeedsAttentionApplications(apps, maps.profilesById, maps.profilesByEmail, NOW).map(
        (row) => row.id,
      ),
    ).toEqual(["2"]);
  });
});

describe("NEEDS_ATTENTION_AWAITING_DAYS", () => {
  it("uses a 7-day threshold", () => {
    expect(NEEDS_ATTENTION_AWAITING_DAYS).toBe(7);
  });
});
