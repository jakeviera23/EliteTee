import { describe, expect, it } from "vitest";
import {
  buildMemberReferralLink,
  normalizeReferralCode,
  parseMemberReferralInvite,
  parseMemberReferralStats,
} from "./referrals";

describe("mobile referral helpers", () => {
  it("normalizes referral codes", () => {
    expect(normalizeReferralCode("abc123def456789012345678")).toBe("abc123def456789012345678");
    expect(normalizeReferralCode("invalid")).toBeNull();
  });

  it("builds join URLs", () => {
    expect(buildMemberReferralLink("abc123def456789012345678")).toBe(
      "https://www.elitetee.club/join/abc123def456789012345678",
    );
  });

  it("parses invite RPC payloads", () => {
    expect(parseMemberReferralInvite({ code: "abc123def456789012345678" })).toEqual({
      code: "abc123def456789012345678",
      referralUrl: "https://www.elitetee.club/join/abc123def456789012345678",
    });
  });

  it("parses stats RPC payloads", () => {
    expect(parseMemberReferralStats({ pending_count: 2, joined_count: 1 })).toEqual({
      pendingCount: 2,
      joinedCount: 1,
    });
  });
});
