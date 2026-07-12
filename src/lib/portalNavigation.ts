export type PortalPrimaryTab =
  | "feed"
  | "discover"
  | "ask"
  | "compose"
  | "courses"
  | "introductions"
  | "messages"
  | "profile";

export const PORTAL_DESKTOP_PRIMARY_TABS: { id: PortalPrimaryTab; label: string }[] = [
  { id: "feed", label: "Feed" },
  { id: "discover", label: "Discover" },
  { id: "ask", label: "Ask EliteTee" },
  { id: "courses", label: "Courses" },
  { id: "introductions", label: "Introductions" },
  { id: "profile", label: "Profile" },
];

export const PORTAL_MOBILE_BOTTOM_TABS: { id: PortalPrimaryTab; label: string }[] = [
  { id: "feed", label: "Feed" },
  { id: "discover", label: "Discover" },
  { id: "ask", label: "Ask" },
  { id: "courses", label: "Courses" },
  { id: "profile", label: "Profile" },
];

export const PORTAL_HEADER_ACTIONS = ["notifications", "messages", "signOut"] as const;

export type PortalHeaderAction = (typeof PORTAL_HEADER_ACTIONS)[number];

export function portalPrimaryTabIds(tabs: { id: PortalPrimaryTab; label: string }[]) {
  return tabs.map((tab) => tab.id);
}
