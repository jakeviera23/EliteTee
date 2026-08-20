export type CreateOptionStatus = "live" | "pending";

export type CreateOption = {
  id: string;
  title: string;
  description: string;
  status: CreateOptionStatus;
  route?: string;
};

export const CREATE_OPTIONS: CreateOption[] = [
  {
    id: "post-update",
    title: "Post Update",
    description: "Share a note with the member network.",
    status: "live",
    route: "/(app)/create/post-update",
  },
  {
    id: "share-round",
    title: "Share a Round",
    description: "Document a course experience with rating and photos.",
    status: "live",
    route: "/(app)/create/share-round",
  },
  {
    id: "looking-for-game",
    title: "Looking for a Game",
    description: "Find members to play with at your club or destination.",
    status: "live",
    route: "/(app)/create/looking-for-game",
  },
  {
    id: "golf-travel",
    title: "Golf Travel Plans",
    description: "Share upcoming travel and courses on your list.",
    status: "live",
    route: "/(app)/create/golf-travel",
  },
  {
    id: "request-intro",
    title: "Request an Introduction",
    description: "Ask for a warm introduction to another member.",
    status: "live",
    route: "/introductions",
  },
  {
    id: "ask-community",
    title: "Ask the Community",
    description: "Pose a question to EliteTee members.",
    status: "live",
    route: "/(app)/create/ask-community",
  },
];
