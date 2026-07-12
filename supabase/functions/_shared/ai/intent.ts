import type { AiIntent } from "./types.ts";

const COURSE_HINTS = [
  "course",
  "courses",
  "rated",
  "rating",
  "links",
  "reviewed",
  "directory",
  "national golf",
  "pebble",
  "st andrews",
];

const INTRO_HINTS = [
  "introduction",
  "introduce",
  "meet",
  "connect",
  "who should i",
  "who shares",
  "travel interests",
  "travel interest",
];

const MEMBER_HINTS = [
  "member",
  "members",
  "golfer",
  "golfers",
  "played",
  "florida",
  "architecture",
  "travel",
];

export function classifyIntent(question: string, explicitIntent?: AiIntent): AiIntent {
  if (explicitIntent && explicitIntent !== "unsupported") {
    return explicitIntent;
  }

  const lower = question.trim().toLowerCase();
  if (!lower) return "unsupported";

  const courseScore = COURSE_HINTS.reduce((score, hint) => score + (lower.includes(hint) ? 1 : 0), 0);
  const introScore = INTRO_HINTS.reduce((score, hint) => score + (lower.includes(hint) ? 1 : 0), 0);
  const memberScore = MEMBER_HINTS.reduce((score, hint) => score + (lower.includes(hint) ? 1 : 0), 0);

  if (lower.includes("highest-rated") || lower.includes("highest rated")) {
    return "find_courses";
  }

  if (
    lower.includes("which members have played") ||
    lower.includes("members have played") ||
    lower.includes("who has played") ||
    lower.includes("who've played") ||
    lower.includes("who have played")
  ) {
    return "find_members";
  }

  if (courseScore > introScore && courseScore >= memberScore && courseScore > 0) {
    return "find_courses";
  }

  if (introScore > 0 && introScore >= memberScore) {
    return "recommend_introductions";
  }

  if (memberScore > 0) {
    return "find_members";
  }

  return "find_members";
}

export function isSelfIdentityQuestion(question: string): boolean {
  return /^who am i\??$/i.test(question.trim());
}

/** Extract a member name/term for RPC `query` filter. Empty string = no text filter (return all portal members). */
export function extractMemberSearchQuery(question: string): string {
  const trimmed = question.trim();
  if (!trimmed) return "";

  if (
    /^(show|list|see|display|get)\s+(all\s+)?members?\??$/i.test(trimmed) ||
    /^all\s+members?\??$/i.test(trimmed)
  ) {
    return "";
  }

  if (isSelfIdentityQuestion(trimmed)) {
    return "";
  }

  const findMatch = trimmed.match(/^(?:find|search for|look up|lookup)\s+(.+?)\??$/i);
  if (findMatch?.[1]) {
    return findMatch[1].trim().slice(0, 80);
  }

  const namedMatch = trimmed.match(/members?\s+(?:named|called)\s+(.+?)\??$/i);
  if (namedMatch?.[1]) {
    return namedMatch[1].trim().slice(0, 80);
  }

  const whoIsMatch = trimmed.match(/^who(?:'s|\s+is|\s+are)\s+(.+?)\??$/i);
  if (whoIsMatch?.[1] && !/^i(\s|$)/i.test(whoIsMatch[1].trim())) {
    return whoIsMatch[1].trim().slice(0, 80);
  }

  // Location/introduction questions should not filter by the full question text.
  if (
    /\bwho should i meet\b/i.test(trimmed) ||
    /\bwho shares\b/i.test(trimmed) ||
    /\bwho can i meet\b/i.test(trimmed)
  ) {
    return "";
  }

  return "";
}

export function buildRetrievalFilters(question: string, intent: AiIntent) {
  const lower = question.toLowerCase();

  const locationMatch =
    lower.match(/\bin\s+([a-z\s]+?)(?:\?|$| who| with| interested| that)/i)?.[1]?.trim() ??
    "";

  const interestMatch =
    lower.match(/interested in\s+([^?.!]+)/i)?.[1]?.trim() ??
    (lower.includes("architecture") ? "architecture" : "");

  const travelMatch = lower.includes("travel") ? lower.replace(/.*travel/i, "travel").trim() : "";

  const courseQuery = question
    .replace(/show me\s+/i, "")
    .replace(/find\s+/i, "")
    .replace(/highly rated\s+/i, "")
    .replace(/highest-rated\s+/i, "")
    .replace(/courses?\s+/i, "")
    .trim();

  if (intent === "find_courses") {
    return {
      courseQuery: courseQuery || question,
      memberFilters: {},
    };
  }

  return {
    courseQuery: "",
    memberFilters: {
      query: extractMemberSearchQuery(question),
      location: locationMatch,
      interest: interestMatch,
      travel: travelMatch.includes("travel") ? travelMatch : "",
    },
  };
}

export function extractCourseNameFromQuestion(question: string): string | null {
  const playedMatch = question.match(/(?:played|play at|played at)\s+(.+?)\??$/i);
  if (playedMatch?.[1]) {
    return playedMatch[1].trim();
  }
  return null;
}
