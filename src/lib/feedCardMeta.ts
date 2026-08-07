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

export type FeedCaptionPreview = {
  text: string;
  isTruncated: boolean;
};

export function getFeedCaptionPreview(
  caption: string,
  expanded: boolean,
  maxLength = 320,
): FeedCaptionPreview {
  const trimmed = caption.trim();
  if (expanded || trimmed.length <= maxLength) {
    return { text: trimmed, isTruncated: false };
  }

  const initial = trimmed.slice(0, maxLength);
  const wordBoundary = initial.lastIndexOf(" ");
  const preview = wordBoundary > maxLength * 0.7 ? initial.slice(0, wordBoundary) : initial;
  return { text: `${preview.trimEnd()}…`, isTruncated: true };
}

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

/**
 * Removes facts already presented in a course card's title, location, and
 * rating treatment. The underlying post data is unchanged.
 */
export function buildVisibleFeedMetaChips(
  post: FeedPost,
  isCourseRound: boolean,
): FeedMetaChip[] {
  const chips = buildFeedMetaChips(post);
  if (!isCourseRound) return chips;

  return chips
    .filter((chip) => {
      if (chip.tone === "rating") return false;
      if (
        chip.tone === "location" &&
        post.courseLocation.trim() &&
        chip.value.trim().toLowerCase() === post.courseLocation.trim().toLowerCase()
      ) {
        return false;
      }
      return true;
    })
    .slice(0, 4);
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
