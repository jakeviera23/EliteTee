import type { FeedPost } from "../data/portalSocial";
import { formatCourseRatingDisplay } from "./courseRating";
import { isMeaningfulProfileText } from "./portalProfileDisplay";

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

function detailValue(post: FeedPost, labelMatch: (label: string) => boolean): string {
  for (const detail of post.details ?? []) {
    const label = detail.label?.toLowerCase().trim() ?? "";
    const value = detail.value?.trim() ?? "";
    if (!value || !isMeaningfulProfileText(value)) continue;
    if (labelMatch(label)) return value;
  }
  return "";
}

function isExperienceCoreDetailLabel(label: string): boolean {
  const lower = label.toLowerCase().trim();
  return (
    lower === "location" ||
    lower === "played" ||
    lower === "course rating" ||
    lower === "rating" ||
    lower.includes("would play")
  );
}

/**
 * One compact experience meta line (Location · Rating · Date · With).
 * Course title stays in the card header — not repeated here.
 */
export function buildFeedExperienceMetaLine(post: FeedPost): string | null {
  if (!isCourseRoundPost(post)) return null;

  const parts: string[] = [];

  const location =
    (isMeaningfulProfileText(post.courseLocation) ? post.courseLocation.trim() : "") ||
    detailValue(post, (label) => label === "location");
  if (location) parts.push(location);

  if (post.rating != null) {
    const ratingDisplay = formatCourseRatingDisplay(post.rating);
    if (ratingDisplay) parts.push(ratingDisplay);
  }

  const played = detailValue(post, (label) => label === "played");
  if (played) parts.push(played);

  if (post.playedWith?.trim() && isMeaningfulProfileText(post.playedWith)) {
    parts.push(`With ${post.playedWith.trim()}`);
  }

  const wouldPlay = detailValue(post, (label) => label.includes("would play"));
  if (wouldPlay && wouldPlay.toLowerCase() !== "yes") {
    parts.push(`Would play again: ${wouldPlay}`);
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}

/**
 * Compact metadata chips for feed cards — display only, no data mutation.
 * Experience/round posts omit Location / Rating / Played / Would play again chips
 * (those belong on the compact meta line). Default "Would play again: Yes" is never shown.
 */
export function buildFeedMetaChips(post: FeedPost): FeedMetaChip[] {
  const chips: FeedMetaChip[] = [];
  const isRound = isCourseRoundPost(post);

  for (const detail of post.details ?? []) {
    const value = detail.value?.trim();
    if (!value || !isMeaningfulProfileText(value)) continue;

    const labelLower = detail.label.toLowerCase().trim();
    if (isRound && isExperienceCoreDetailLabel(labelLower)) continue;
    if (labelLower.includes("would play") && value.toLowerCase() === "yes") continue;
    if ((labelLower === "course rating" || labelLower === "rating") && post.rating != null) {
      continue;
    }

    chips.push({
      key: `${detail.label}-${value}`,
      label: normalizeLabel(detail.label),
      value,
      tone: toneForDetail(detail.label, value),
    });
  }

  if (!isRound && post.rating != null) {
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

  if (!isRound && post.playedWith?.trim() && isMeaningfulProfileText(post.playedWith)) {
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
