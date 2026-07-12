import { describe, expect, it } from "vitest";
import {
  PORTAL_DESKTOP_PRIMARY_TABS,
  PORTAL_HEADER_ACTIONS,
  PORTAL_MOBILE_BOTTOM_TABS,
  portalPrimaryTabIds,
} from "./portalNavigation";

describe("portal navigation", () => {
  it("keeps exactly five items in mobile bottom navigation", () => {
    expect(PORTAL_MOBILE_BOTTOM_TABS).toHaveLength(5);
    expect(portalPrimaryTabIds(PORTAL_MOBILE_BOTTOM_TABS)).toEqual([
      "feed",
      "discover",
      "ask",
      "courses",
      "profile",
    ]);
  });

  it("removes messages from desktop primary and mobile bottom navigation", () => {
    expect(portalPrimaryTabIds(PORTAL_DESKTOP_PRIMARY_TABS)).not.toContain("messages");
    expect(portalPrimaryTabIds(PORTAL_MOBILE_BOTTOM_TABS)).not.toContain("messages");
  });

  it("keeps messages in header actions alongside notifications", () => {
    expect(PORTAL_HEADER_ACTIONS).toEqual(["notifications", "messages", "signOut"]);
  });

  it("includes introductions on desktop primary navigation", () => {
    expect(portalPrimaryTabIds(PORTAL_DESKTOP_PRIMARY_TABS)).toContain("introductions");
    expect(portalPrimaryTabIds(PORTAL_MOBILE_BOTTOM_TABS)).not.toContain("introductions");
  });
});
