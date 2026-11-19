import { formatCourseRatingDisplay } from "./courseRating";
import type { MobileFeedPost } from "@/types/feed";

export type FeedMetaChipTone =
  | "location"
  | "date"
  | "rating"
  | "positive"
  | "neutral"
  | "emphasis";

export type FeedMetaChip = {
  key: string;
  label: string;
  value: string;
  tone: FeedMetaChipTone;
};

function normalizeLabel(label: string): string {
  const lower = label.toLowerCase().trim();
  if (lower === "played") return "Played";
  if (lower.includes("would play")) return "Would play again";
  if (lower === "course rating") return "Rating";
  return label;
}

function toneForDetail(label: string, value: string): FeedMetaChipTone {
  const lower = label.toLowerCase().trim();
  const valueLower = value.toLowerCase().trim();

  if (
    lower === "location" ||
    lower === "destination" ||
    lower === "city" ||
    lower === "club/course" ||
    lower === "courses"
  ) {
    return "location";
  }

  if (lower === "played" || lower === "dates" || lower.includes("availability")) {
    return "date";
  }

  if (lower === "course rating" || lower === "rating") {
    return "rating";
  }

  if (lower.includes("would play")) {
    return valueLower === "yes" ? "positive" : "emphasis";
  }

  return "neutral";
}

/** Compact metadata chips for feed cards — display only. */
export function buildFeedMetaChips(post: MobileFeedPost): FeedMetaChip[] {
  const chips: FeedMetaChip[] = [];

  for (const detail of post.details ?? []) {
    const value = detail.value?.trim();
    if (!value) continue;

    const labelLower = detail.label.toLowerCase().trim();
    if (labelLower === "course rating" && post.rating != null) continue;

    chips.push({
      key: `${detail.label}-${value}`,
      label: normalizeLabel(detail.label),
      value,
      tone: toneForDetail(detail.label, value),
    });
  }

  if (post.rating != null) {
    const ratingDisplay = formatCourseRatingDisplay(post.rating);
    if (ratingDisplay) {
      const alreadyHasRating = chips.some((chip) => chip.label === "Rating");
      if (!alreadyHasRating) {
        chips.push({
          key: `rating-${ratingDisplay}`,
          label: "Rating",
          value: `${ratingDisplay}/10.0`,
          tone: "rating",
        });
      }
    }
  }

  if (post.playedWith?.trim()) {
    const alreadyHasPlayedWith = chips.some(
      (chip) => chip.label.toLowerCase() === "with" || chip.label.toLowerCase() === "played with",
    );
    if (!alreadyHasPlayedWith) {
      chips.push({
        key: `played-with-${post.playedWith}`,
        label: "With",
        value: post.playedWith.trim(),
        tone: "neutral",
      });
    }
  }

  return chips;
}
