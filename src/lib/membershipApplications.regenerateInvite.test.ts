import { beforeEach, describe, expect, it, vi } from "vitest";

const { fromMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
}));

vi.mock("./supabase", () => ({
  supabase: {
    from: fromMock,
  },
}));

vi.mock("./memberReferrals", () => ({
  readStoredReferralCode: vi.fn(() => null),
  clearStoredReferralCode: vi.fn(),
}));

vi.mock("./memberProfiles", () => ({
  createMemberProfileFromApproval: vi.fn(),
}));

import { regenerateApplicationInviteToken } from "./membershipApplications";

type ApplicationRow = {
  id: string;
  full_name: string;
  email: string;
  location: string;
  home_club: string;
  golf_love: string;
  why_join: string;
  status: string;
  applied_at: string;
  reviewed_at: string | null;
  reviewed_by_email: string | null;
  decline_reason: string | null;
  member_profile_id: string | null;
  founding_member_number: string | null;
  invitation_user_id: string | null;
  invitation_email_draft: string | null;
  invitation_link: string | null;
  invite_token: string | null;
  invite_token_created_at: string | null;
  invite_redeemed_at: string | null;
  referrer_member_user_id: string | null;
  referral_code_used: string | null;
  referral_captured_at: string | null;
  created_at: string;
  updated_at: string;
};

function baseRow(overrides: Partial<ApplicationRow> = {}): ApplicationRow {
  return {
    id: "app-1",
    full_name: "Corey D'Angelo",
    email: "corey@example.com",
    location: "NY",
    home_club: "Winged Foot",
    golf_love: "Links",
    why_join: "Community",
    status: "approved",
    applied_at: "2026-01-01T00:00:00.000Z",
    reviewed_at: "2026-01-02T00:00:00.000Z",
    reviewed_by_email: "admin@example.com",
    decline_reason: null,
    member_profile_id: "profile-1",
    founding_member_number: "FM-014",
    invitation_user_id: null,
    invitation_email_draft: "Join: https://www.elitetee.club/invite/oldtoken",
    invitation_link: "https://www.elitetee.club/invite/oldtoken",
    invite_token: "oldtoken",
    invite_token_created_at: "2026-08-01T12:00:00.000Z",
    invite_redeemed_at: null,
    referrer_member_user_id: null,
    referral_code_used: null,
    referral_captured_at: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

function createSelectChain(row: ApplicationRow | null) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(async () => ({ data: row, error: null }));
  return chain;
}

function createUpdateChain(updatedRow: ApplicationRow | null) {
  const filters: { id?: string; status?: string; inviteRedeemedNull?: boolean } = {};
  const chain: Record<string, unknown> = {};
  chain.eq = vi.fn((column: string, value: string) => {
    if (column === "id") filters.id = value;
    if (column === "status") filters.status = value;
    return chain;
  });
  chain.is = vi.fn((column: string, value: null) => {
    if (column === "invite_redeemed_at" && value === null) {
      filters.inviteRedeemedNull = true;
    }
    return chain;
  });
  chain.select = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(async () => {
    if (filters.status !== "approved" || !filters.inviteRedeemedNull) {
      return { data: null, error: null };
    }
    return { data: updatedRow, error: null };
  });
  return { chain, filters };
}

describe("regenerateApplicationInviteToken", () => {
  beforeEach(() => {
    fromMock.mockReset();
    vi.useRealTimers();
  });

  it("succeeds for missing + unredeemed invites", async () => {
    const existing = baseRow({
      invite_token: null,
      invitation_link: null,
      invite_token_created_at: null,
      invitation_email_draft: null,
    });
    const updated = baseRow({
      invite_token: "newtoken",
      invitation_link: "https://www.elitetee.club/invite/newtoken",
      invite_token_created_at: "2026-08-26T12:00:00.000Z",
    });
    const selectChain = createSelectChain(existing);
    const { chain: updateChain, filters } = createUpdateChain(updated);

    fromMock.mockImplementation(() => ({
      select: selectChain.select,
      update: vi.fn(() => updateChain),
    }));

    const { data, error } = await regenerateApplicationInviteToken("app-1");

    expect(error).toBeNull();
    expect(data?.inviteToken).toMatch(/^[a-f0-9]{64}$/);
    expect(data?.application.invite_token).toBeTruthy();
    expect(data?.application.invite_token_created_at).toBeTruthy();
    expect(filters.status).toBe("approved");
    expect(filters.inviteRedeemedNull).toBe(true);
  });

  it("succeeds for expired + unredeemed invites", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-26T12:00:00.000Z"));

    const existing = baseRow({
      invite_token: "expiredtokenabc",
      invitation_link: "https://www.elitetee.club/invite/expiredtokenabc",
      invite_token_created_at: "2026-06-01T12:00:00.000Z",
      invite_redeemed_at: null,
    });
    const updated = baseRow({
      invite_token: "fresh",
      invitation_link: "https://www.elitetee.club/invite/fresh",
      invite_token_created_at: "2026-08-26T12:00:00.000Z",
    });
    const selectChain = createSelectChain(existing);
    const updatePayload: Record<string, unknown>[] = [];
    const { chain: updateChain, filters } = createUpdateChain(updated);
    const updateFn = vi.fn((payload: Record<string, unknown>) => {
      updatePayload.push(payload);
      return updateChain;
    });

    fromMock.mockImplementation(() => ({
      select: selectChain.select,
      update: updateFn,
    }));

    const { data, error } = await regenerateApplicationInviteToken("app-1");

    expect(error).toBeNull();
    expect(data?.inviteToken).toMatch(/^[a-f0-9]{64}$/);
    expect(data?.inviteToken).not.toBe("expiredtokenabc");
    expect(updatePayload[0]?.invite_token_created_at).toBe("2026-08-26T12:00:00.000Z");
    expect(updatePayload[0]).toMatchObject({
      invitation_link: expect.stringContaining("/invite/"),
    });
    expect(updatePayload[0]).not.toHaveProperty("status");
    expect(updatePayload[0]).not.toHaveProperty("founding_member_number");
    expect(updatePayload[0]).not.toHaveProperty("member_profile_id");
    expect(updatePayload[0]).not.toHaveProperty("invite_redeemed_at");
    expect(filters.status).toBe("approved");
    expect(filters.inviteRedeemedNull).toBe(true);
  });

  it("blocks regeneration for valid invitations", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-10T12:00:00.000Z"));

    const existing = baseRow({
      invite_token: "validtoken",
      invite_token_created_at: "2026-08-01T12:00:00.000Z",
      invite_redeemed_at: null,
    });
    const selectChain = createSelectChain(existing);
    const updateFn = vi.fn();

    fromMock.mockImplementation(() => ({
      select: selectChain.select,
      update: updateFn,
    }));

    const { data, error } = await regenerateApplicationInviteToken("app-1");

    expect(data).toBeNull();
    expect(error?.message).toMatch(/still valid/i);
    expect(updateFn).not.toHaveBeenCalled();
  });

  it("blocks regeneration for redeemed invitations", async () => {
    const existing = baseRow({
      invite_token: "redeemedtoken",
      invite_token_created_at: "2026-06-01T12:00:00.000Z",
      invite_redeemed_at: "2026-07-01T12:00:00.000Z",
    });
    const selectChain = createSelectChain(existing);
    const updateFn = vi.fn();

    fromMock.mockImplementation(() => ({
      select: selectChain.select,
      update: updateFn,
    }));

    const { data, error } = await regenerateApplicationInviteToken("app-1");

    expect(data).toBeNull();
    expect(error?.message).toMatch(/already been redeemed/i);
    expect(updateFn).not.toHaveBeenCalled();
  });
});
