import { ComposerFeedScreen } from "@/components/create/ComposerFeedScreen";

const config = {
  title: "Ask the Community",
  subtitle: "Pose a question to EliteTee members.",
  composerPostType: "general" as const,
  internalPostType: "played-today" as const,
  badge: "Discussion",
  headlineFallback: "General Discussion",
  fields: [],
};

export default function AskCommunityScreen() {
  return <ComposerFeedScreen config={config} />;
}
