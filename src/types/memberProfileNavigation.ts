export type PortalProfileTab =
  | "feed"
  | "discover"
  | "ask"
  | "compose"
  | "courses"
  | "messages"
  | "introductions"
  | "profile";

export type ProfileReturnContext =
  | { type: "portal"; tab: PortalProfileTab; label: string }
  | { type: "route"; path: string; label: string };

export type ViewMemberProfileOptions = {
  userId: string;
  memberName?: string;
  returnTo: ProfileReturnContext;
};

export type ViewMemberProfileHandler = (
  userId: string,
  memberName: string,
  returnTo?: ProfileReturnContext,
) => void;
