import { getSiteUrl } from "../env";

export function getPublicSiteUrl() {
  return getSiteUrl().replace(/\/$/, "") || "https://www.elitetee.club";
}

/** Same redirect target as web password recovery / invite confirmation. */
export function getAuthCallbackUrl() {
  return `${getPublicSiteUrl()}/auth/callback`;
}

export function getLoginUrl(options?: { recovery?: boolean }) {
  const url = new URL(`${getPublicSiteUrl()}/login`);
  if (options?.recovery) {
    url.searchParams.set("recovery", "1");
  }
  return url.toString();
}

export function getInviteUrl(token: string) {
  return `${getPublicSiteUrl()}/invite/${encodeURIComponent(token.trim())}`;
}
