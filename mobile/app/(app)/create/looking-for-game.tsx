import { ComposerFeedScreen } from "@/components/create/ComposerFeedScreen";

const config = {
  title: "Looking for a Game",
  subtitle: "Find members to play with at your club or destination.",
  composerPostType: "looking-for-game" as const,
  internalPostType: "played-today" as const,
  badge: "Looking for Game",
  headlineFallback: "Looking for a game",
  primaryKey: "location" as const,
  primaryLabel: "Club/Course",
  fields: [
    {
      key: "location",
      label: "Club/Course",
      placeholder: "Search courses or type a club name",
      kind: "course" as const,
    },
    {
      key: "dates",
      label: "Dates",
      placeholder: "e.g. Apr 12–14 or next weekend",
      kind: "dates" as const,
    },
    {
      key: "players",
      label: "Looking for",
      placeholder: "Who would you like to play with?",
      optional: true,
    },
  ],
};

export default function LookingForGameScreen() {
  return <ComposerFeedScreen config={config} />;
}
