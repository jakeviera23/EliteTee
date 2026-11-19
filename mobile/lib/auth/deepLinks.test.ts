import { describe, expect, it } from "vitest";
import { resolveMobileDeepLink } from "./deepLinks";

const SITE = "https://www.elitetee.club";

describe("resolveMobileDeepLink", () => {
  it("captures invite tokens from app and web links", () => {
    expect(resolveMobileDeepLink("elitetee://open?invite=abc123")).toEqual({
      kind: "invite",
      token: "abc123",
      openUrl: `${SITE}/invite/abc123`,
    });
    expect(resolveMobileDeepLink(`${SITE}/invite/xyz`)).toMatchObject({
      kind: "invite",
      token: "xyz",
    });
  });

  it("forwards recovery callbacks with their tokens to the web completion page", () => {
    const hash = "#access_token=t&refresh_token=r&type=recovery";
    expect(resolveMobileDeepLink(`${SITE}/auth/callback${hash}`)).toEqual({
      kind: "recovery",
      openUrl: `${SITE}/auth/callback${hash}`,
    });
  });

  it("sends tokenless recovery links to web login recovery", () => {
    expect(resolveMobileDeepLink("elitetee://login?recovery=1")).toEqual({
      kind: "recovery",
      openUrl: `${SITE}/login?recovery=1`,
    });
  });

  it("forwards generic auth callbacks", () => {
    expect(resolveMobileDeepLink(`${SITE}/auth/callback?code=abc`)).toEqual({
      kind: "auth_callback",
      openUrl: `${SITE}/auth/callback?code=abc`,
    });
  });

  it("ignores unrelated links", () => {
    expect(resolveMobileDeepLink("elitetee://feed")).toEqual({ kind: "none" });
    expect(resolveMobileDeepLink("")).toEqual({ kind: "none" });
    expect(resolveMobileDeepLink(null)).toEqual({ kind: "none" });
  });
});
