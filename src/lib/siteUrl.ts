const PRODUCTION_SITE_URL = "https://www.elitetee.club";

export const AUTH_CALLBACK_PATH = "/auth/callback";

export function getConfiguredSiteUrl(): string {
  return (import.meta.env.VITE_SITE_URL ?? "").trim().replace(/\/$/, "");
}

export function getPublicSiteUrl(): string {
  return getConfiguredSiteUrl() || PRODUCTION_SITE_URL;
}

export function getRuntimeOrigin(): string | null {
  if (typeof window === "undefined") return null;
  return window.location.origin.replace(/\/$/, "") || null;
}

export function getEmailRedirectTo(): string {
  const origin = getRuntimeOrigin() || getPublicSiteUrl();
  return `${origin}${AUTH_CALLBACK_PATH}`;
}
