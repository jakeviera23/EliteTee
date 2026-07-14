import { describe, expect, it, vi } from "vitest";
import type { MembershipApplicationRecord } from "../types/membershipApplication";
import type { AdminMemberRow } from "./memberProfiles";
import {
  buildOverviewMetrics,
  computeInviteMetrics,
  getApplicationInviteStatus,
  describeMemberOperationalState,
  filterAdminMembers,
  logAdminQueryError,
  truncateAdminText,
} from "./adminDashboard";

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
    reviewed_at: null,
    reviewed_by_email: null,
    decline_reason: null,
    member_profile_id: null,
    founding_member_number: "FM-001",
    invitation_user_id: null,
    invitation_email_draft: null,
    invitation_link: null,
    invite_token: null,
    invite_token_created_at: null,
    invite_redeemed_at: null,
    created_at: "2026-07-01T12:00:00.000Z",
    updated_at: "2026-07-01T12:00:00.000Z",
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
    portal_access_enabled: true,
    created_at: "2026-07-01T12:00:00.000Z",
    user_id: "user-1",
    ...overrides,
  };
}

describe("computeInviteMetrics", () => {
  it("counts awaiting, redeemed, and missing invite links", () => {
    expect(
      computeInviteMetrics([
        application({ id: "1", invite_token: "abc" }),
        application({ id: "2", invite_redeemed_at: "2026-07-02T12:00:00.000Z" }),
        application({ id: "3" }),
      ]),
    ).toEqual({
      awaitingRedemption: 1,
      redeemed: 1,
      missingLink: 1,
    });
  });
});

describe("buildOverviewMetrics", () => {
  it("maps dashboard and invite metrics into overview cards", () => {
    expect(
      buildOverviewMetrics({
        pendingApplications: 2,
        approvedMembers: 10,
        profilesCreated: 12,
        portalActiveMembers: 8,
        inviteMetrics: { awaitingRedemption: 3, redeemed: 5, missingLink: 1 },
        aiDashboard: {
          settings: {
            enabled: true,
            enable_find_members: true,
            enable_find_courses: true,
            enable_recommend_introductions: true,
            daily_member_limit: 20,
            updated_at: "2026-07-01T12:00:00.000Z",
          },
          queries_today: 4,
          queries_7d: 18,
          failures_7d: 1,
          intent_breakdown_7d: {},
          token_usage_7d: { input_tokens: 1, output_tokens: 2 },
          recent_error_codes: [],
          feedback_average_7d: 4.5,
          feedback_count_7d: 2,
        },
      }),
    ).toMatchObject({
      pendingApplications: 2,
      invitesAwaiting: 3,
      askQueriesToday: 4,
      aiFailures7d: 1,
    });
  });
});

describe("describeMemberOperationalState", () => {
  it("identifies active, awaiting login, and portal disabled states", () => {
    expect(describeMemberOperationalState(member({ id: "1" }))).toEqual({
      state: "active",
      label: "Active in portal",
    });
    expect(describeMemberOperationalState(member({ id: "2", user_id: null }))).toEqual({
      state: "awaiting_login",
      label: "Awaiting login link",
    });
    expect(
      describeMemberOperationalState(member({ id: "3", portal_access_enabled: false })),
    ).toEqual({
      state: "portal_disabled",
      label: "Portal not enabled",
    });
  });
});

describe("filterAdminMembers", () => {
  it("filters by search text and operational state", () => {
    const rows = [
      member({ id: "1", full_name: "Alex Kim", portal_access_enabled: true }),
      member({ id: "2", full_name: "Jordan Lee", user_id: null }),
    ];

    expect(filterAdminMembers(rows, { search: "alex", filter: "all" }).map((row) => row.id)).toEqual([
      "1",
    ]);
    expect(filterAdminMembers(rows, { search: "", filter: "awaiting" }).map((row) => row.id)).toEqual([
      "2",
    ]);
  });
});

describe("truncateAdminText", () => {
  it("truncates long operational copy", () => {
    expect(truncateAdminText("Short text")).toBe("Short text");
    expect(truncateAdminText("a".repeat(200), 20)).toMatch(/…$/);
  });
});

describe("getApplicationInviteStatus", () => {
  it("classifies invite states from application fields", () => {
    expect(getApplicationInviteStatus(application({ id: "1", invite_token: "abc" }))).toBe("ready");
    expect(
      getApplicationInviteStatus(
        application({ id: "2", invite_redeemed_at: "2026-07-02T12:00:00.000Z" }),
      ),
    ).toBe("redeemed");
    expect(getApplicationInviteStatus(application({ id: "3" }))).toBe("missing");
  });
});

describe("logAdminQueryError", () => {
  it("logs structured Supabase error fields for development", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    logAdminQueryError("fetchMemberProfilesForAdmin", {
      message: "column member_profiles.created_at does not exist",
      code: "42703",
      hint: 'Perhaps you meant to reference the column "member_profiles.updated_at".',
    });

    expect(errorSpy).toHaveBeenCalledWith(
      "[Admin] fetchMemberProfilesForAdmin",
      expect.objectContaining({
        code: "42703",
        message: "column member_profiles.created_at does not exist",
      }),
    );

    errorSpy.mockRestore();
  });
});
