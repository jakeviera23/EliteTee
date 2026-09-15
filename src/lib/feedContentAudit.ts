import type { FeedPost } from "../data/portalSocial";

const SEVERE_MEMBER_STREAM_FLAGS = new Set([
  "Empty message body",
  "Message may be unparsed JSON",
  "Raw structured content visible",
  "Placeholder or test copy",
]);

/**
 * Heuristic flags for feed posts that may need manual editorial cleanup.
 * Prefer shouldSuppressFeedPostFromMemberStream() for member-facing filtering.
 */
export function getFeedContentFlags(post: FeedPost): string[] {
  if (post.id === "founder-welcome") return [];

  const flags: string[] = [];
  const caption = post.caption?.trim() ?? "";
  const courseName = post.courseName?.trim() ?? "";

  if (!caption) {
    flags.push("Empty message body");
  }

  if (caption.startsWith("{") || caption.startsWith("[")) {
    flags.push("Message may be unparsed JSON");
  }

  if (/"message"\s*:|"composerPostType"\s*:/.test(caption)) {
    flags.push("Raw structured content visible");
  }

  if (/^(test|asdf|lorem ipsum|hello world)\b/i.test(caption) && caption.length < 80) {
    flags.push("Placeholder or test copy");
  }

  if (
    post.images.length > 0 &&
    !courseName &&
    post.postType !== "photo"
  ) {
    flags.push("Course imagery without course title");
  }

  if (
    courseName &&
    post.requestLabel &&
    courseName.toLowerCase() === post.requestLabel.toLowerCase() &&
    caption.length < 40
  ) {
    flags.push("Headline repeats badge with little detail");
  }

  if (post.details?.some((detail) => !detail.value?.trim())) {
    flags.push("Incomplete detail fields");
  }

  if (caption.length > 600 && !caption.includes("\n")) {
    flags.push("Very long single block — consider formatting");
  }

  return flags;
}

/** Suppress only severe empty/test/JSON-like posts from the member Feed stream. */
export function shouldSuppressFeedPostFromMemberStream(post: FeedPost): boolean {
  return getFeedContentFlags(post).some((flag) => SEVERE_MEMBER_STREAM_FLAGS.has(flag));
}
