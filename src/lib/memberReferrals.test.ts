import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  buildMemberReferralLink,
  clearStoredReferralCode,
  extractReferralCodeFromPath,
  normalizeReferralCode,
  parseMemberReferralInvite,
  parseMemberReferralStats,
  readStoredReferralCode,
  storeReferralCode,
} from "./memberReferrals";

describe("normalizeReferralCode", () => {
  it("accepts 24-char lowercase hex codes", () => {
    expect(normalizeReferralCode("abc123def456789012345678")).toBe("abc123def456789012345678");
    expect(normalizeReferralCode("  ABC123DEF456789012345678  ")).toBe("abc123def456789012345678");
  });

  it("rejects invalid codes", () => {
    expect(normalizeReferralCode("")).toBeNull();
    expect(normalizeReferralCode("tooshort")).toBeNull();
    expect(normalizeReferralCode("gggggggggggggggggggggggg")).toBeNull();
    expect(normalizeReferralCode(null)).toBeNull();
  });
});

describe("buildMemberReferralLink", () => {
  it("builds a /join/{code} URL on the public site", () => {
    expect(buildMemberReferralLink("abc123def456789012345678")).toBe(
      "https://www.elitetee.club/join/abc123def456789012345678",
    );
  });
});

describe("extractReferralCodeFromPath", () => {
  it("parses /join/{code} paths", () => {
    expect(extractReferralCodeFromPath("/join/abc123def456789012345678")).toBe(
      "abc123def456789012345678",
    );
    expect(extractReferralCodeFromPath("/join/abc123def456789012345678/")).toBe(
      "abc123def456789012345678",
    );
  });

  it("returns null for non-referral paths", () => {
    expect(extractReferralCodeFromPath("/invite/token")).toBeNull();
    expect(extractReferralCodeFromPath("/")).toBeNull();
  });
});

describe("referral session storage", () => {
  beforeEach(() => {
    const memoryStorage = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => memoryStorage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memoryStorage.set(key, value);
      },
      removeItem: (key: string) => {
        memoryStorage.delete(key);
      },
    });
    clearStoredReferralCode();
  });

  it("stores and reads a valid referral code", () => {
    expect(storeReferralCode("abc123def456789012345678")).toBe(true);
    expect(readStoredReferralCode()).toBe("abc123def456789012345678");
  });

  it("ignores invalid codes", () => {
    expect(storeReferralCode("bad-code")).toBe(false);
    expect(readStoredReferralCode()).toBeNull();
  });

  it("clears stored referral state", () => {
    storeReferralCode("abc123def456789012345678");
    clearStoredReferralCode();
    expect(readStoredReferralCode()).toBeNull();
  });
});

describe("parseMemberReferralInvite", () => {
  it("parses invite RPC payloads", () => {
    expect(parseMemberReferralInvite({ code: "abc123def456789012345678" })).toEqual({
      code: "abc123def456789012345678",
      referralUrl: "https://www.elitetee.club/join/abc123def456789012345678",
    });
  });

  it("rejects invalid invite payloads", () => {
    expect(parseMemberReferralInvite(null)).toBeNull();
    expect(parseMemberReferralInvite({ code: "bad" })).toBeNull();
  });
});

describe("parseMemberReferralStats", () => {
  it("parses stats RPC payloads", () => {
    expect(parseMemberReferralStats({ pending_count: 2, joined_count: 1 })).toEqual({
      pendingCount: 2,
      joinedCount: 1,
    });
  });

  it("defaults missing counts to zero", () => {
    expect(parseMemberReferralStats({})).toEqual({
      pendingCount: 0,
      joinedCount: 0,
    });
  });
});
