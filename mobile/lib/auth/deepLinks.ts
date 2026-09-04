import * as Linking from "expo-linking";
import { getAuthCallbackUrl, getInviteUrl, getLoginUrl, getPublicSiteUrl } from "./siteUrls";

export type MobileDeepLinkAction =
  | { kind: "invite"; token: string; openUrl: string }
  | { kind: "recovery"; openUrl: string }
  | { kind: "auth_callback"; openUrl: string }
  | { kind: "none" };

function safeParseUrl(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    try {
      return new URL(raw.replace(/^elitetee:/i, "https://elitetee.local"));
    } catch {
      return null;
    }
  }
}

function extractInviteToken(pathname: string, searchParams: URLSearchParams): string | null {
  const inviteMatch = pathname.match(/\/invite\/([^/]+)\/?$/i);
  if (inviteMatch?.[1]) {
    return decodeURIComponent(inviteMatch[1]).trim() || null;
  }

  const fromQuery = searchParams.get("invite") || searchParams.get("token");
  return fromQuery?.trim() || null;
}

function looksLikeRecovery(url: URL): boolean {
  const type = (url.searchParams.get("type") || "").toLowerCase();
  if (type === "recovery") return true;
  if (url.searchParams.get("recovery") === "1") return true;

  const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  if (!hash) return false;

  try {
    const hashParams = new URLSearchParams(hash);
    return (hashParams.get("type") || "").toLowerCase() === "recovery";
  } catch {
    return hash.toLowerCase().includes("type=recovery");
  }
}

function isAuthCallbackPath(pathname: string): boolean {
  return /\/auth\/callback\/?$/i.test(pathname);
}

/**
 * Map inbound links to mobile actions.
 * Recovery and auth callbacks intentionally hand off to the web flow.
 */
export function resolveMobileDeepLink(rawUrl: string | null | undefined): MobileDeepLinkAction {
  const raw = rawUrl?.trim();
  if (!raw) return { kind: "none" };

  const url = safeParseUrl(raw);
  if (!url) return { kind: "none" };

  const pathname = url.pathname || "";
  const inviteToken = extractInviteToken(pathname, url.searchParams);
  if (inviteToken) {
    return {
      kind: "invite",
      token: inviteToken,
      openUrl: getInviteUrl(inviteToken),
    };
  }

  if (looksLikeRecovery(url)) {
    // Prefer sending members through the existing web recovery completion UI.
    if (isAuthCallbackPath(pathname) || url.hash.includes("access_token")) {
      return {
        kind: "recovery",
        openUrl: `${getAuthCallbackUrl()}${url.search}${url.hash}`,
      };
    }
    return { kind: "recovery", openUrl: getLoginUrl({ recovery: true }) };
  }

  if (isAuthCallbackPath(pathname)) {
    return {
      kind: "auth_callback",
      openUrl: `${getAuthCallbackUrl()}${url.search}${url.hash}`,
    };
  }

  return { kind: "none" };
}

export async function openExternalEliteTeeUrl(url: string) {
  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) {
    throw new Error(`Unable to open ${url}`);
  }
  await Linking.openURL(url);
}

export function describeSiteHost() {
  try {
    return new URL(getPublicSiteUrl()).host;
  } catch {
    return "elitetee.club";
  }
}
