import { experienceCopy } from "../data/portalSocial";
import type { FeedPost } from "../data/portalSocial";

const LEGACY_EXPERIENCE_BADGES = new Set([
  "course played",
  "course review",
  "round review",
  "round played",
]);

/** Map legacy/system course-round badges to the canonical Experience label. */
export function normalizeFeedExperienceBadge(label: string | null | undefined): string {
  const trimmed = label?.trim() ?? "";
  if (!trimmed) return experienceCopy.feedBadge;

  if (LEGACY_EXPERIENCE_BADGES.has(trimmed.toLowerCase())) {
    return experienceCopy.feedBadge;
  }

  return trimmed;
}

export function resolveFeedCardBadgeLabel(post: FeedPost): string {
  const raw = post.requestLabel ?? post.roundType ?? "";
  if (raw.trim()) {
    return normalizeFeedExperienceBadge(raw);
  }

  if (post.postType === "course-review" || post.memberCourseRoundId) {
    return experienceCopy.feedBadge;
  }

  return raw;
}
