import { experienceCopy, type FeedPost, type PortalGolfer } from "../data/portalSocial";
import { formatCourseRatingDisplay } from "./courseRating";
import { isMeaningfulProfileText } from "./portalProfileDisplay";
import { truncateProfileFeedExcerpt } from "./profilePageDisplay";

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

export function isMeaningfulFeedLocation(value: unknown) {
  return isMeaningfulProfileText(value);
}

export function resolveFeedAuthorRole(author: PortalGolfer): string | null {
  if (isMeaningfulProfileText(author.title)) {
    return String(author.title).trim();
  }

  if (isMeaningfulProfileText(author.homeCourse)) {
    return author.homeCourse.trim();
  }

  return null;
}

export type ProfileFeedActivityPreview = {
  postId: string;
  title: string;
  excerpt: string;
  timestamp: string;
  ratingLabel: string | null;
  locationLabel: string | null;
  thumbnailUrl: string | null;
  badgeLabel: string | null;
};

export function buildProfileFeedActivityPreview(post: FeedPost): ProfileFeedActivityPreview {
  const title =
    post.courseName?.trim() ||
    post.requestLabel?.trim() ||
    post.caption.trim().split("\n")[0]?.trim() ||
    "Feed post";
  const thumbnailUrl = post.mediaItems?.[0]?.url ?? post.images?.[0] ?? null;
  const ratingLabel = post.rating != null ? formatCourseRatingDisplay(post.rating) : null;
  const locationLabel = isMeaningfulFeedLocation(post.courseLocation)
    ? post.courseLocation.trim()
    : null;

  return {
    postId: post.id,
    title,
    excerpt: truncateProfileFeedExcerpt(post.caption),
    timestamp: post.timestamp,
    ratingLabel,
    locationLabel,
    thumbnailUrl,
    badgeLabel: resolveFeedCardBadgeLabel(post) || null,
  };
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
