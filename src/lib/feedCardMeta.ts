import type { FeedPost } from "../data/portalSocial";
import { formatCourseRatingDisplay } from "./courseRating";

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
    lower === "club/course"
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

/** Compact metadata chips for feed cards — display only, no data mutation. */
export function buildFeedMetaChips(post: FeedPost): FeedMetaChip[] {
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
      chips.push({
        key: `rating-${ratingDisplay}`,
        label: "Rating",
        value: `${ratingDisplay}/10.0`,
        tone: "rating",
      });
    }
  }

  if (post.playedWith?.trim()) {
    chips.push({
      key: `played-with-${post.playedWith}`,
      label: "With",
      value: post.playedWith.trim(),
      tone: "neutral",
    });
  }

  return chips;
}

/** Badge tone from request label / post type — feed presentation only. */
export function badgeToneForPost(post: FeedPost): FeedMetaChipTone {
  const label = (post.requestLabel ?? post.postType ?? "").toLowerCase();

  if (
    label.includes("course") ||
    label.includes("round") ||
    label.includes("played") ||
    label.includes("experience")
  ) {
    return "positive";
  }

  if (label.includes("travel") || label.includes("business") || label.includes("destination")) {
    return "location";
  }

  if (label.includes("introduction") || label.includes("founder")) {
    return "rating";
  }

  return "neutral";
}

export function isCourseRoundPost(post: FeedPost): boolean {
  const label = post.requestLabel?.toLowerCase() ?? "";
  return (
    post.postType === "course-review" ||
    Boolean(post.memberCourseRoundId) ||
    label.includes("course played") ||
    label.includes("experience")
  );
}
