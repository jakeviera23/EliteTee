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
      placeholder: "Where are you looking to play?",
    },
    {
      key: "dates",
      label: "Dates",
      placeholder: "When are you available?",
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
