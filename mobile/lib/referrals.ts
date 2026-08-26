import { getPublicSiteUrl } from "./auth/siteUrls";

const REFERRAL_CODE_PATTERN = /^[a-f0-9]{24}$/;

export function normalizeReferralCode(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return REFERRAL_CODE_PATTERN.test(normalized) ? normalized : null;
}

export function buildMemberReferralLink(code: string): string {
  const normalized = normalizeReferralCode(code);
  if (!normalized) {
    throw new Error("Invalid referral code.");
  }
  return `${getPublicSiteUrl()}/join/${encodeURIComponent(normalized)}`;
}

export function parseMemberReferralInvite(data: unknown): { code: string; referralUrl: string } | null {
  if (!data || typeof data !== "object") return null;

  const row = data as Record<string, unknown>;
  const code = normalizeReferralCode(String(row.code ?? ""));
  if (!code) return null;

  return {
    code,
    referralUrl: buildMemberReferralLink(code),
  };
}

export function parseMemberReferralStats(data: unknown): { pendingCount: number; joinedCount: number } | null {
  if (!data || typeof data !== "object") return null;

  const row = data as Record<string, unknown>;
  return {
    pendingCount: Number(row.pending_count ?? 0) || 0,
    joinedCount: Number(row.joined_count ?? 0) || 0,
  };
}
