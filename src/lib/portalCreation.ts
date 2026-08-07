import type { ComposerPostType } from "../data/portalSocial";

export type PortalCreateActionId =
  | "post-update"
  | "share-round"
  | "looking-for-game"
  | "golf-travel"
  | "recommend-course"
  | "share-photos"
  | "request-introduction"
  | "ask-community";

export type PortalCreateActionGroup = "share" | "connect";

export type PortalCreateDestination =
  | { kind: "composer"; composerPostType: ComposerPostType }
  | { kind: "photo-composer" }
  | { kind: "round" }
  | { kind: "discover-introduction" };

export type PortalCreateAction = {
  id: PortalCreateActionId;
  label: string;
  description: string;
  group: PortalCreateActionGroup;
  destination: PortalCreateDestination;
};

export const PORTAL_CREATE_ACTIONS: PortalCreateAction[] = [
  { id: "post-update", label: "Post an Update", description: "Share a note with the private member community.", group: "share", destination: { kind: "composer", composerPostType: "general" } },
  { id: "share-round", label: "Share a Round", description: "Document a course, rating, story, and photographs.", group: "share", destination: { kind: "round" } },
  { id: "looking-for-game", label: "Looking for a Game", description: "Share where and when you would like to play.", group: "connect", destination: { kind: "composer", composerPostType: "looking-for-game" } },
  { id: "golf-travel", label: "Golf Travel Plans", description: "Let members know where your golf will take you.", group: "connect", destination: { kind: "composer", composerPostType: "traveling" } },
  { id: "recommend-course", label: "Recommend a Course", description: "Tell members which course deserves their attention.", group: "share", destination: { kind: "composer", composerPostType: "round-review" } },
  { id: "share-photos", label: "Share Photos", description: "Share a private gallery and the story behind it.", group: "share", destination: { kind: "photo-composer" } },
  { id: "request-introduction", label: "Request an Introduction", description: "Choose a member and begin a considered connection.", group: "connect", destination: { kind: "discover-introduction" } },
  { id: "ask-community", label: "Ask the Community", description: "Start a conversation with the full member network.", group: "connect", destination: { kind: "composer", composerPostType: "general" } },
];

// feed_post_media is introduced by migration 061. Keep the entry in the action
// registry so it can be enabled deliberately after the migration is reviewed,
// but never offer a flow that the current production schema cannot persist.
export const FEED_POST_MEDIA_ENABLED = false;

export function isPortalCreateActionAvailable(action: PortalCreateAction): boolean {
  return action.id !== "share-photos" || FEED_POST_MEDIA_ENABLED;
}

export function getAvailablePortalCreateActions(): PortalCreateAction[] {
  return PORTAL_CREATE_ACTIONS.filter(isPortalCreateActionAvailable);
}

export const PORTAL_CREATE_GROUP_LABELS: Record<PortalCreateActionGroup, string> = {
  share: "Share",
  connect: "Connect",
};

export function getPortalCreateAction(id: PortalCreateActionId) {
  return PORTAL_CREATE_ACTIONS.find((action) => action.id === id) ?? null;
}
