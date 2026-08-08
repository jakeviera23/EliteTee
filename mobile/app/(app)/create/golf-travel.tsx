import { ComposerFeedScreen } from "@/components/create/ComposerFeedScreen";

const config = {
  title: "Golf Travel Plans",
  subtitle: "Share upcoming travel and courses on your list.",
  composerPostType: "traveling" as const,
  internalPostType: "golf-travel" as const,
  badge: "Traveling",
  headlineFallback: "Travel plans",
  primaryKey: "destination" as const,
  primaryLabel: "Destination",
  fields: [
    {
      key: "destination",
      label: "Destination",
      placeholder: "Where are you traveling?",
    },
    {
      key: "dates",
      label: "Dates",
      placeholder: "When will you be there?",
    },
    {
      key: "courses",
      label: "Courses",
      placeholder: "Courses or clubs on your list",
      optional: true,
    },
  ],
};

export default function GolfTravelScreen() {
  return <ComposerFeedScreen config={config} />;
}
