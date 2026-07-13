import { PORTAL_MOBILE_BOTTOM_TABS } from "./portalNavigation";

/** Mobile bottom navigation uses five equal-width columns (not six). */
export const PORTAL_MOBILE_BOTTOM_NAV_COLUMN_COUNT = 5;

/** Full labels shown without ellipsis truncation on mobile bottom nav. */
export const PORTAL_MOBILE_BOTTOM_NAV_LABELS = PORTAL_MOBILE_BOTTOM_TABS.map((tab) => tab.label);

/** Featured course rails scroll inside their container on mobile. */
export const PORTAL_MOBILE_FEATURED_RAIL = {
  overflowX: "auto" as const,
  overscrollBehaviorInline: "contain" as const,
  scrollPaddingInline: "var(--portal-mobile-gutter)",
  cardFlexBasis: "min(calc(100vw - (2 * var(--portal-mobile-gutter)) - 1.25rem), 22rem)",
};

/** Mobile messages thread uses layout pinning instead of sticky overlap. */
export const PORTAL_MOBILE_MESSAGES_THREAD_LAYOUT = "grid-pinned";

/** Courses add button drops the desktop min-width on mobile. */
export const PORTAL_MOBILE_COURSES_ADD_BTN_MIN_WIDTH = 0;

/** Mobile portal stylesheet implementing this contract. */
export const PORTAL_MOBILE_LAYOUT_STYLESHEET = "member-portal-mobile.css";
