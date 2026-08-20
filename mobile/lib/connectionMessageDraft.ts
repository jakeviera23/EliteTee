import type { MobileFeedPost } from "@/types/feed";

/**
 * Editable connection-context starters for opening a DM from a feed post.
 * Never auto-sends — callers only prefill the composer.
 */
export function buildConnectionMessageDraftFromPost(post: MobileFeedPost): string {
  const badge = (post.badge ?? "").toLowerCase();
  const headline = post.headline?.trim() || "";
  const destination =
    post.details?.find((detail) => /destination|traveling|location/i.test(detail.label))?.value?.trim() ||
    "";
  const course =
    post.details?.find((detail) => /course|club/i.test(detail.label))?.value?.trim() ||
    headline;
  const dates =
    post.details?.find((detail) => /date/i.test(detail.label))?.value?.trim() || "";

  if (badge.includes("travel") || /travel/i.test(headline)) {
    const place = destination || course || headline || "your trip";
    const when = dates ? ` in ${dates}` : "";
    return `Saw you're heading to ${place}${when} — I'd love to connect.`;
  }

  if (badge.includes("looking") || badge.includes("game") || /looking for/i.test(headline)) {
    const place = course || headline || "this round";
    return `I'm interested in joining ${place}${dates ? ` (${dates})` : ""}.`;
  }

  if (badge.includes("experience") || badge.includes("round") || post.memberCourseRoundId) {
    const place = course || headline || "your round";
    return `I'd like to connect about ${place}.`;
  }

  if (headline) {
    return `I'd like to connect about ${headline}.`;
  }

  return "";
}

export function buildIntroductionAcceptedMessageDraft(memberName: string): string {
  const name = memberName.trim() || "there";
  return `Hi ${name} — thanks for accepting the introduction. Looking forward to connecting.`;
}
