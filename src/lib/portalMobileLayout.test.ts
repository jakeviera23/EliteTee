import { describe, expect, it } from "vitest";
import {
  PORTAL_MOBILE_BOTTOM_NAV_COLUMN_COUNT,
  PORTAL_MOBILE_BOTTOM_NAV_LABELS,
  PORTAL_MOBILE_COURSE_RATING_BADGE,
  PORTAL_MOBILE_COURSE_STATS_COLUMNS,
  PORTAL_MOBILE_COURSE_CARD_TYPOGRAPHY,
  PORTAL_MOBILE_COURSES_ADD_BTN_MIN_WIDTH,
  PORTAL_MOBILE_FEATURED_COURSE_CARD,
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
      scrollSnapType: "x proximity",
      scrollPaddingInline: "var(--portal-mobile-gutter)",
      cardWidth: "calc(100vw - 40px)",
    });
  });

  it("defines the mobile featured course card width contract", () => {
    expect(PORTAL_MOBILE_FEATURED_COURSE_CARD).toEqual({
      width: "calc(100vw - 40px)",
      flexBasis: "calc(100vw - 40px)",
      bodyPaddingPx: 20,
    });
  });

  it("keeps the rating badge inside the media region", () => {
    expect(PORTAL_MOBILE_COURSE_RATING_BADGE).toEqual({
      topPx: 12,
      rightPx: 12,
      zIndex: 3,
    });
  });

  it("uses a two-column mobile stats grid", () => {
    expect(PORTAL_MOBILE_COURSE_STATS_COLUMNS).toBe(2);
  });

  it("uses stable mobile course typography without vw units", () => {
    expect(PORTAL_MOBILE_COURSE_CARD_TYPOGRAPHY).toEqual({
      titlePx: 28,
      mediaNamePx: 18,
      locationPx: 16,
      metadataLabelPx: 12,
      statsValuePx: 18,
      buttonLabelPx: 15,
    });

    const typographyValues = Object.values(PORTAL_MOBILE_COURSE_CARD_TYPOGRAPHY).join(" ");
    expect(typographyValues).not.toMatch(/vw|clamp/i);
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
