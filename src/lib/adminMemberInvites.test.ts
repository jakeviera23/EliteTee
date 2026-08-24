import { describe, expect, it } from "vitest";
import type { MembershipApplicationRecord } from "../types/membershipApplication";
import type { AdminMemberRow } from "./memberProfiles";
import {
  findApprovedApplicationForMember,
  getInvitationEmailDraftForApplication,
  memberHasRecoverableInvite,
} from "./adminMemberInvites";

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
    reviewed_by_email: "founder@example.com",
    decline_reason: null,
    member_profile_id: "profile-1",
    founding_member_number: "FM-001",
    invitation_user_id: null,
    invitation_email_draft: "Stored draft",
    invitation_link: "https://www.elitetee.club/invite/abc123",
    invite_token: "abc123",
    invite_token_created_at: "2026-07-02T12:00:00.000Z",
    invite_redeemed_at: null,
    referrer_member_user_id: null,
    referral_code_used: null,
    referral_captured_at: null,
    created_at: "2026-07-01T12:00:00.000Z",
    updated_at: "2026-07-02T12:00:00.000Z",
    ...overrides,
  };
}

function member(overrides: Partial<AdminMemberRow> & Pick<AdminMemberRow, "id">): AdminMemberRow {
  return {
    full_name: "Jordan Lee",
    email: "jordan@example.com",
    primary_club: "Seminole",
    based_in: "Florida",
    membership_status: "Founding Member",
    is_verified: true,
    founding_member_number: "FM-001",
    portal_access_enabled: false,
    created_at: "2026-07-01T12:00:00.000Z",
    user_id: null,
    ...overrides,
  };
}

describe("findApprovedApplicationForMember", () => {
  it("matches by member profile id before email", () => {
    const apps = [
      application({ id: "app-1", member_profile_id: "profile-1" }),
      application({
        id: "app-2",
        email: "other@example.com",
        member_profile_id: "profile-2",
      }),
    ];

    expect(findApprovedApplicationForMember(member({ id: "profile-1" }), apps)?.id).toBe("app-1");
  });

  it("returns null for linked members", () => {
    expect(
      findApprovedApplicationForMember(member({ id: "profile-1", user_id: "auth-1" }), [
        application({ id: "app-1" }),
      ]),
    ).toBeNull();
  });
});

describe("memberHasRecoverableInvite", () => {
  it("is true when the member is unlinked and the invite is ready", () => {
    expect(
      memberHasRecoverableInvite(member({ id: "profile-1" }), application({ id: "app-1" })),
    ).toBe(true);
  });

  it("is false when the invite has been redeemed", () => {
    expect(
      memberHasRecoverableInvite(
        member({ id: "profile-1" }),
        application({ id: "app-1", invite_redeemed_at: "2026-07-03T12:00:00.000Z" }),
      ),
    ).toBe(false);
  });
});

describe("getInvitationEmailDraftForApplication", () => {
  it("reuses the stored invitation draft when available", () => {
    expect(getInvitationEmailDraftForApplication(application({ id: "app-1" }))).toBe(
      "Stored draft",
    );
  });

  it("builds a draft from the existing invite link when none is stored", () => {
    const draft = getInvitationEmailDraftForApplication(
      application({ id: "app-1", invitation_email_draft: null }),
    );

    expect(draft).toContain("https://www.elitetee.club/invite/abc123");
    expect(draft).toContain("FM-001");
  });
});
