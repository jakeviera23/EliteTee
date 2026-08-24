import { getPublicSiteUrl } from "./siteUrl";

export const REFERRAL_CODE_STORAGE_KEY = "elitetee_referral_code";

/** 24-char lowercase hex from 12 random bytes (matches DB generator). */
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

export function readStoredReferralCode(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  return normalizeReferralCode(sessionStorage.getItem(REFERRAL_CODE_STORAGE_KEY));
}

export function storeReferralCode(code: string): boolean {
  if (typeof sessionStorage === "undefined") return false;
  const normalized = normalizeReferralCode(code);
  if (!normalized) return false;
  sessionStorage.setItem(REFERRAL_CODE_STORAGE_KEY, normalized);
  return true;
}

export function clearStoredReferralCode(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(REFERRAL_CODE_STORAGE_KEY);
}

export function extractReferralCodeFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/join\/([^/]+)\/?$/i);
  if (!match?.[1]) return null;
  try {
    return normalizeReferralCode(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}
