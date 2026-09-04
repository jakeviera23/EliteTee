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
      placeholder: "e.g. May 3–10 or early June",
      kind: "dates" as const,
    },
    {
      key: "courses",
      label: "Courses",
      placeholder: "Search to add courses, or type your list",
      optional: true,
      kind: "course-list" as const,
    },
  ],
};

export default function GolfTravelScreen() {
  return <ComposerFeedScreen config={config} />;
}
