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
  { id: "feed", label: "Home" },
  { id: "discover", label: "Discover" },
  { id: "ask", label: "Ask EliteTee" },
  { id: "courses", label: "Courses" },
  { id: "introductions", label: "Introductions" },
  { id: "profile", label: "Profile" },
];

export const PORTAL_MOBILE_BOTTOM_TABS: { id: PortalPrimaryTab; label: string }[] = [
  { id: "feed", label: "Home" },
  { id: "discover", label: "Discover" },
  { id: "ask", label: "Ask" },
  { id: "courses", label: "Courses" },
  { id: "introductions", label: "Intro" },
  { id: "profile", label: "Profile" },
];

export const PORTAL_HEADER_ACTIONS = ["notifications", "messages", "signOut"] as const;

export type PortalHeaderAction = (typeof PORTAL_HEADER_ACTIONS)[number];

export type PortalRouteDestination = PortalPrimaryTab | "activity";

const PORTAL_DESTINATION_PATHS: Record<PortalRouteDestination, string> = {
  feed: "/member-portal",
  discover: "/member-portal/discover",
  ask: "/member-portal/ask",
  compose: "/member-portal/create",
  courses: "/courses",
  introductions: "/member-portal/introductions",
  messages: "/member-portal/messages",
  activity: "/member-portal/activity",
  profile: "/member-portal/profile",
};

export function getPortalDestinationPath(destination: PortalRouteDestination): string {
  return PORTAL_DESTINATION_PATHS[destination];
}

export function getPortalDestinationFromPath(pathname: string): PortalRouteDestination | null {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  if (normalized === "/member-portal/home") return "feed";

  const entry = Object.entries(PORTAL_DESTINATION_PATHS).find(
    ([, path]) => path === normalized,
  );
  return (entry?.[0] as PortalRouteDestination | undefined) ?? null;
}

export function getPortalViewForDestination(
  destination: PortalRouteDestination | null,
): PortalPrimaryTab {
  return destination === "activity" || !destination ? "feed" : destination;
}

export function portalPrimaryTabIds(tabs: { id: PortalPrimaryTab; label: string }[]) {
  return tabs.map((tab) => tab.id);
}
