import { describe, expect, it } from "vitest";
import {
  PORTAL_MOBILE_BOTTOM_NAV_COLUMN_COUNT,
  PORTAL_MOBILE_BOTTOM_NAV_LABELS,
  PORTAL_MOBILE_COURSES_ADD_BTN_MIN_WIDTH,
  PORTAL_MOBILE_FEATURED_RAIL,
  PORTAL_MOBILE_LAYOUT_STYLESHEET,
  PORTAL_MOBILE_MESSAGES_THREAD_LAYOUT,
} from "./portalMobileLayout";

describe("portal mobile layout structure", () => {
  it("uses five equal bottom-nav columns on mobile", () => {
    expect(PORTAL_MOBILE_BOTTOM_NAV_COLUMN_COUNT).toBe(5);
  });

  it("exposes full mobile bottom-nav labels without truncation", () => {
    expect(PORTAL_MOBILE_BOTTOM_NAV_LABELS).toEqual([
      "Feed",
      "Discover",
      "Ask",
      "Courses",
      "Profile",
    ]);
  });

  it("defines internally scrollable featured rails on mobile", () => {
    expect(PORTAL_MOBILE_FEATURED_RAIL).toEqual({
      overflowX: "auto",
      overscrollBehaviorInline: "contain",
      scrollPaddingInline: "var(--portal-mobile-gutter)",
      cardFlexBasis: "min(calc(100vw - (2 * var(--portal-mobile-gutter)) - 1.25rem), 22rem)",
    });
  });

  it("pins mobile messages thread header without sticky overlap", () => {
    expect(PORTAL_MOBILE_MESSAGES_THREAD_LAYOUT).toBe("grid-pinned");
  });

  it("drops desktop min-width on the courses add button for mobile", () => {
    expect(PORTAL_MOBILE_COURSES_ADD_BTN_MIN_WIDTH).toBe(0);
  });

  it("documents the mobile layout stylesheet contract", () => {
    expect(PORTAL_MOBILE_LAYOUT_STYLESHEET).toBe("member-portal-mobile.css");
  });
});
