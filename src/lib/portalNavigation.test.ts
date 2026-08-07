import { describe, expect, it } from "vitest";
import {
  PORTAL_DESKTOP_PRIMARY_TABS,
  PORTAL_HEADER_ACTIONS,
  PORTAL_MOBILE_BOTTOM_TABS,
  getPortalDestinationFromPath,
  getPortalDestinationPath,
  getPortalViewForDestination,
  portalPrimaryTabIds,
} from "./portalNavigation";

describe("portal navigation", () => {
  it("keeps all six primary destinations in mobile bottom navigation", () => {
    expect(PORTAL_MOBILE_BOTTOM_TABS).toHaveLength(6);
    expect(portalPrimaryTabIds(PORTAL_MOBILE_BOTTOM_TABS)).toEqual([
      "feed",
      "discover",
      "ask",
      "courses",
      "introductions",
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

  it("includes introductions in desktop and mobile primary navigation", () => {
    expect(portalPrimaryTabIds(PORTAL_DESKTOP_PRIMARY_TABS)).toContain("introductions");
    expect(portalPrimaryTabIds(PORTAL_MOBILE_BOTTOM_TABS)).toContain("introductions");
  });

  it("maps every bookmarkable member destination to a stable URL", () => {
    expect(getPortalDestinationPath("feed")).toBe("/member-portal");
    expect(getPortalDestinationPath("discover")).toBe("/member-portal/discover");
    expect(getPortalDestinationPath("ask")).toBe("/member-portal/ask");
    expect(getPortalDestinationPath("courses")).toBe("/courses");
    expect(getPortalDestinationPath("introductions")).toBe("/member-portal/introductions");
    expect(getPortalDestinationPath("messages")).toBe("/member-portal/messages");
    expect(getPortalDestinationPath("activity")).toBe("/member-portal/activity");
    expect(getPortalDestinationPath("profile")).toBe("/member-portal/profile");
  });

  it("restores portal views from direct paths and keeps Activity over Home", () => {
    expect(getPortalDestinationFromPath("/member-portal/discover/")).toBe("discover");
    expect(getPortalDestinationFromPath("/member-portal/activity")).toBe("activity");
    expect(getPortalDestinationFromPath("/unknown")).toBeNull();
    expect(getPortalViewForDestination("activity")).toBe("feed");
  });
});
