import { PORTAL_MOBILE_BOTTOM_TABS } from "./portalNavigation";

/** Mobile bottom navigation uses six equal-width columns. */
export const PORTAL_MOBILE_BOTTOM_NAV_COLUMN_COUNT = 6;

/** Full labels shown without ellipsis truncation on mobile bottom nav. */
export const PORTAL_MOBILE_BOTTOM_NAV_LABELS = PORTAL_MOBILE_BOTTOM_TABS.map((tab) => tab.label);

/** Featured course rails scroll inside their container on mobile. */
export const PORTAL_MOBILE_FEATURED_RAIL = {
  overflowX: "auto" as const,
  overscrollBehaviorInline: "contain" as const,
  scrollSnapType: "x proximity" as const,
  scrollPaddingInline: "var(--portal-mobile-gutter)",
  cardWidth: "calc(100vw - 40px)",
};

/** Mobile featured course card sizing contract. */
export const PORTAL_MOBILE_FEATURED_COURSE_CARD = {
  width: "calc(100vw - 40px)",
  flexBasis: "calc(100vw - 40px)",
  bodyPaddingPx: 20,
};

/** Mobile course card stats use a two-column grid with a full-width recommend row. */
export const PORTAL_MOBILE_COURSE_STATS_COLUMNS = 2;

/** Stable mobile course card typography (no vw units). */
export const PORTAL_MOBILE_COURSE_CARD_TYPOGRAPHY = {
  titlePx: 28,
  mediaNamePx: 18,
  locationPx: 16,
  metadataLabelPx: 12,
  statsValuePx: 18,
  buttonLabelPx: 15,
};

/** Rating badge anchors inside the media region on mobile. */
export const PORTAL_MOBILE_COURSE_RATING_BADGE = {
  topPx: 12,
  rightPx: 12,
  zIndex: 3,
};

/** Mobile messages thread uses layout pinning instead of sticky overlap. */
export const PORTAL_MOBILE_MESSAGES_THREAD_LAYOUT = "grid-pinned";

/** Courses add button drops the desktop min-width on mobile. */
export const PORTAL_MOBILE_COURSES_ADD_BTN_MIN_WIDTH = 0;

/** Mobile portal stylesheet implementing this contract. */
export const PORTAL_MOBILE_LAYOUT_STYLESHEET = "member-portal-mobile.css";
