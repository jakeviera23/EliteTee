import type { MemberProfileRecord } from "../types/memberProfileRecord";
import { isMeaningfulProfileText } from "./portalProfileDisplay";

export const FIRST_SESSION_DISMISS_KEY = "elitetee:first-session-getting-started-dismissed";

export type FirstSessionActionId =
  | "complete-profile"
  | "discover"
  | "request-introduction"
  | "share-experience"
  | "invite-golfer";

export type FirstSessionAction = {
  id: FirstSessionActionId;
  title: string;
  description: string;
};

export const FIRST_SESSION_ACTIONS: FirstSessionAction[] = [
  {
    id: "complete-profile",
    title: "Complete your profile",
    description: "Help members know where you play and what you’re looking for.",
  },
  {
    id: "discover",
    title: "Discover a golfer",
    description: "Browse members by club, location, interests, and travel.",
  },
  {
    id: "request-introduction",
    title: "Request an introduction",
    description: "Start a private connection from Discover or a member profile.",
  },
  {
    id: "share-experience",
    title: "Share an experience",
    description: "Add a round so others can learn from where you’ve played.",
  },
  {
    id: "invite-golfer",
    title: "Invite a golfer",
    description: "Bring in someone who belongs in EliteTee.",
  },
];

function canUseLocalStorage(): boolean {
  try {
    const storage = (globalThis as { localStorage?: Storage }).localStorage;
    if (!storage) return false;
    const probe = "__elitetee_fs_probe__";
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function isFirstSessionGettingStartedDismissed(): boolean {
  if (!canUseLocalStorage()) return false;
  try {
    return localStorage.getItem(FIRST_SESSION_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissFirstSessionGettingStarted() {
  if (!canUseLocalStorage()) return;
  try {
    localStorage.setItem(FIRST_SESSION_DISMISS_KEY, "1");
  } catch {
    // Ignore quota / private-mode failures.
  }
}

/** Location, home club, or about text missing — safe signal to open Edit Profile. */
export function isProfileClearlyIncomplete(profile: MemberProfileRecord | null | undefined): boolean {
  if (!profile) return true;
  if (!isMeaningfulProfileText(profile.based_in)) return true;
  if (!isMeaningfulProfileText(profile.primary_club)) return true;
  if (!isMeaningfulProfileText(profile.current_request)) return true;
  return false;
}
