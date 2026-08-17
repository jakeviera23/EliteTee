import { describe, expect, it } from "vitest";
import { AUTH_CALLBACK_PATH, getEmailRedirectTo, getPublicSiteUrl } from "./siteUrl";

describe("siteUrl", () => {
  it("builds the auth callback redirect from the public site URL", () => {
    expect(getEmailRedirectTo()).toBe(`${getPublicSiteUrl()}${AUTH_CALLBACK_PATH}`);
  });

  it("uses the configured or production EliteTee host", () => {
    expect(getPublicSiteUrl()).toMatch(/^https?:\/\//);
    expect(getEmailRedirectTo()).toContain("/auth/callback");
  });
});
