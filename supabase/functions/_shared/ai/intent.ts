import { normalizeCourseLocationQuery } from "./course-location.ts";
import type { AiIntent } from "./types.ts";
import type { CourseDirectoryFilters } from "./course-directory-answer.ts";

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

/** Boundary after a place mention — never capture the rest of the question. */
const PLACE_BOUNDARY =
  /(?=\s*(?:\?|$|\.|,|;|!|\s+who\b|\s+with\b|\s+interested\b|\s+that\b|\s+and\s+who\b|\s+for\b))/i;

export function classifyIntent(question: string, explicitIntent?: AiIntent): AiIntent {
  if (explicitIntent && explicitIntent !== "unsupported") {
    return explicitIntent;
  }

  const lower = question.trim().toLowerCase();
  if (!lower) return "unsupported";

  const courseScore = COURSE_HINTS.reduce((score, hint) => score + (lower.includes(hint) ? 1 : 0), 0);
  const introScore = INTRO_HINTS.reduce((score, hint) => score + (lower.includes(hint) ? 1 : 0), 0);
  const memberScore = MEMBER_HINTS.reduce((score, hint) => score + (lower.includes(hint) ? 1 : 0), 0);

  if (isTopRatedCourseQuery(lower) || lower.includes("highest-rated") || lower.includes("highest rated")) {
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

/**
 * Extract a place name after in / to / near / traveling to.
 * Returns a short place phrase only — never the remainder of the question.
 */
export function extractPlaceMention(question: string): string {
  const trimmed = question.trim();
  if (!trimmed) return "";

  const patterns = [
    new RegExp(
      String.raw`\b(?:traveling|travelling|headed|heading)\s+to\s+([a-z0-9\s'.-]{2,40}?)${PLACE_BOUNDARY.source}`,
      "i",
    ),
    new RegExp(
      String.raw`\b(?:near|(?<!interested\s)in|to)\s+([a-z0-9\s'.-]{2,40}?)${PLACE_BOUNDARY.source}`,
      "i",
    ),
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    const place = match?.[1]?.trim() ?? "";
    if (!place) continue;
    if (/^(the|a|an)$/i.test(place)) continue;
    // Reject if we accidentally captured question words.
    if (/\b(who|should|connect|meet|members?|courses?)\b/i.test(place)) continue;
    return normalizeCourseLocationQuery(place);
  }

  return "";
}

/**
 * Travel destination as a clean place name when the question uses travel language.
 * Never returns the raw remainder of the question after "travel".
 */
export function extractTravelDestination(question: string): string {
  const trimmed = question.trim();
  if (!trimmed) return "";

  if (!/\b(travel|traveling|travelling|trip|headed|heading)\b/i.test(trimmed)) {
    return "";
  }

  const travelTo = trimmed.match(
    new RegExp(
      String.raw`\b(?:traveling|travelling|travel|headed|heading)\s+to\s+([a-z0-9\s'.-]{2,40}?)${PLACE_BOUNDARY.source}`,
      "i",
    ),
  )?.[1]?.trim();

  if (travelTo && !/\b(who|should|connect|meet|members?|courses?)\b/i.test(travelTo)) {
    return normalizeCourseLocationQuery(travelTo);
  }

  // "travel interests in Florida" / "travel to Florida" already handled; fall back to any place mention.
  return extractPlaceMention(trimmed);
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
    /\bwho should i (?:meet|connect)\b/i.test(trimmed) ||
    /\bwho shares\b/i.test(trimmed) ||
    /\bwho can i meet\b/i.test(trimmed) ||
    /\bwho should i connect\b/i.test(trimmed) ||
    /\bi(?:'|’)m traveling\b/i.test(trimmed) ||
    /\btraveling to\b/i.test(trimmed)
  ) {
    return "";
  }

  return "";
}

/** Top / best / highest-rated course questions — no invented location from leftovers. */
export function isTopRatedCourseQuery(question: string): boolean {
  const lower = question.trim().toLowerCase();
  if (!lower) return false;
  if (/\b(highest[-\s]?rated|top[-\s]?rated|best[-\s]?rated|best reviewed|most recommended)\b/.test(lower)) {
    return true;
  }
  if (/\b(best|top)\b/.test(lower) && /\bcourses?\b/.test(lower)) return true;
  if (/\breviewed\b/.test(lower) && /\b(best|top|highest)\b/.test(lower)) return true;
  return false;
}

export function buildCourseDirectoryFilters(question: string): CourseDirectoryFilters {
  const lower = question.toLowerCase();
  const topRated = isTopRatedCourseQuery(question);

  const locationMatch = extractPlaceMention(question);

  let accessType: string | null = null;
  if (/\bprivate\b/i.test(lower)) accessType = "private";
  else if (/\bpublic\b/i.test(lower)) accessType = "public";

  let courseType: string | null = null;
  if (/\blinks\b/i.test(lower)) courseType = "links";

  let locationQuery = locationMatch;
  // Never treat leftover question prose as a location (e.g. "best courses members have reviewed").
  if (!locationQuery && !topRated) {
    locationQuery = question
      .replace(/show me\s+/gi, "")
      .replace(/find\s+/gi, "")
      .replace(/what courses are\s+/gi, "")
      .replace(/highly rated\s+/gi, "")
      .replace(/highest-rated\s+/gi, "")
      .replace(/highest rated\s+/gi, "")
      .replace(/\b(private|public)\s+/gi, "")
      .replace(/\blinks\s+/gi, "")
      .replace(/\bcourses?\b/gi, "")
      .replace(/^in\s+/i, "")
      .trim();
  }

  return {
    locationQuery: locationQuery ? normalizeCourseLocationQuery(locationQuery) : "",
    accessType,
    courseType,
    rankByReviews: topRated,
  };
}

export function buildRetrievalFilters(question: string, intent: AiIntent) {
  const lower = question.toLowerCase();

  const place = extractPlaceMention(question);
  const travelDestination = extractTravelDestination(question);

  const interestMatch =
    lower.match(/interested in\s+([^?.!]+)/i)?.[1]?.trim() ??
    (lower.includes("architecture") ? "architecture" : "");

  // Travel-to / destination intros: put the destination in `location` only.
  // RPC location already ORs based_in / regions / traveling_to — do not also AND travel.
  let location = "";
  let travel = "";
  if (travelDestination) {
    location = travelDestination;
    travel = "";
  } else {
    location = place;
    travel = "";
  }

  if (intent === "find_courses") {
    const directoryFilters = buildCourseDirectoryFilters(question);
    return {
      // Empty query lists directory courses ordered by avg_rating (see ai_search_golf_courses).
      courseQuery: directoryFilters.locationQuery,
      courseDirectoryFilters: directoryFilters,
      memberFilters: {},
    };
  }

  return {
    courseQuery: "",
    courseDirectoryFilters: buildCourseDirectoryFilters(""),
    memberFilters: {
      query: extractMemberSearchQuery(question),
      location,
      interest: interestMatch,
      travel,
    },
  };
}

export function extractCourseNameFromQuestion(question: string): string | null {
  const playedMatch = question.match(/(?:played|play at|played at)\s+(.+?)\??$/i);
  if (playedMatch?.[1]) {
    const raw = playedMatch[1].trim();
    // "played in the Hamptons" is a region, not a course name — leave for P1 routing.
    if (/^in\s+/i.test(raw)) return null;
    return raw;
  }
  return null;
}
