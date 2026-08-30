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

const INVALID_LOCATION_VALUES = new Set([
  "elitetee",
  "the network",
  "a course",
  "the course",
  "a club",
  "the club",
  "a golf course",
  "the golf course",
  "golf course",
]);

const GENERIC_COURSE_PLACEHOLDER_PATTERN =
  /^(?:a|the)\s+(?:golf\s+)?(?:course|club)s?$/i;

const PRODUCT_CONTEXT_PHRASES = [
  /\b(?:in|on|within)\s+elitetee\b/i,
  /\b(?:in|on|within)\s+the network\b/i,
];

export type MemberRetrievalFilters = {
  query: string;
  location: string;
  interest: string;
  travel: string;
};

function normalizeExtractedPhrase(raw: string): string {
  return raw
    .replace(/[?!.,;:]+$/g, "")
    .replace(/\s+(who|with|that|might|should|could|can|is|are|was|were|worth|interested)\b.*$/i, "")
    .trim();
}

function isValidLocationFilter(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized.length < 2) return false;
  if (INVALID_LOCATION_VALUES.has(normalized)) return false;
  if (/^a\s+(course|club|member|golfer)s?$/i.test(normalized)) return false;
  if (/^the\s+(course|club|network)$/i.test(normalized)) return false;
  if (/^elitetee(\s|$)/i.test(normalized)) return false;
  return true;
}

function isValidCourseNameFilter(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized.length < 2) return false;
  if (INVALID_LOCATION_VALUES.has(normalized)) return false;
  if (GENERIC_COURSE_PLACEHOLDER_PATTERN.test(normalized)) return false;
  if (/^(the|a)$/i.test(normalized)) return false;
  if (/^elitetee(\s|$)/i.test(normalized)) return false;
  return true;
}

export function isGenericCoursePlaceholder(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;
  if (INVALID_LOCATION_VALUES.has(normalized)) return true;
  if (GENERIC_COURSE_PLACEHOLDER_PATTERN.test(normalized)) return true;
  if (/^(the|a)$/i.test(normalized)) return true;
  return false;
}

export function isGenericIntroductionPlaceholderQuestion(question: string): boolean {
  return (
    /\bhelp with an introduction at\s+(?:a|the)\s+(?:golf\s+)?course\b/i.test(question) ||
    /\bintroduction\s+at\s+(?:a|the)\s+(?:golf\s+)?course\b/i.test(question) ||
    /\bintroduction\s+to\s+(?:a|the)\s+(?:golf\s+)?course\b/i.test(question)
  );
}

export function isGlobalCourseRankingQuestion(question: string): boolean {
  const lower = question.trim().toLowerCase();
  if (!lower) return false;

  if (lower.includes("highest-rated") || lower.includes("highest rated")) return true;
  if (lower.includes("best rated") || lower.includes("best-rated")) return true;
  if (/\bwhich courses\b.*\brated\b/.test(lower)) return true;
  if (/\bwhat are the highest rated courses\b/.test(lower)) return true;
  if (/\bshow me the best rated courses\b/.test(lower)) return true;
  if (/\bwhich courses do members recommend\b/.test(lower)) return true;
  if (/\bmembers recommend most\b/.test(lower)) return true;
  if (/\brecommend most\b/.test(lower) && lower.includes("course")) return true;

  return false;
}

function normalizeCourseName(raw: string): string {
  return normalizeExtractedPhrase(raw).replace(/\s+(?:course|club)$/i, "").trim();
}

export function extractMemberLocationFromQuestion(question: string): string {
  const trimmed = question.trim();
  const patterns = [
    /\bmembers in\s+([a-z][a-z\s'.-]+?)(?:\?|$|\.|,|\s+(?:who|with|that|might|should|worth|interested|is|are|traveling|travelling|going|headed|heading|visiting))/i,
    /\bbased in\s+([a-z][a-z\s'.-]+?)(?:\?|$|\.|,|\s+(?:who|with|that|might|should|worth|interested|is|are|traveling|travelling|going|headed|heading|visiting))/i,
    /\baround\s+([a-z][a-z\s'.-]+?)(?:\?|$|\.|,|\s+(?:who|with|that|might|should|worth|interested|is|are|traveling|travelling|going|headed|heading|visiting))/i,
    /\bnear\s+([a-z][a-z\s'.-]+?)(?:\?|$|\.|,|\s+(?:who|with|that|might|should|worth|interested|is|are|should|traveling|travelling|going|headed|heading|visiting))/i,
    /\bin\s+([a-z][a-z\s'.-]+?)(?:\?|$|\.|,|\s+(?:who|with|that|might|should|worth|interested|is|are|traveling|travelling|going|headed|heading|visiting))/i,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (!match?.[1]) continue;
    const candidate = normalizeExtractedPhrase(match[1]);
    if (!isValidLocationFilter(candidate)) continue;
    if (/^elitetee(\s|$)/i.test(candidate)) continue;
    return candidate;
  }

  return "";
}

export function extractTravelDestinationFromQuestion(question: string): string {
  const trimmed = question.trim();
  const patterns = [
    /\b(?:traveling|travelling)\s+to\s+([a-z][a-z\s'.-]+?)(?:\?|$|\.|,|\s+(?:who|with|that|might|should|worth|interested|in|on))/i,
    /\bgoing\s+to\s+([a-z][a-z\s'.-]+?)(?:\?|$|\.|,|\s+(?:who|with|that|might|should|worth|interested|in|on))/i,
    /\bheaded\s+to\s+([a-z][a-z\s'.-]+?)(?:\?|$|\.|,|\s+(?:who|with|that|might|should|worth|interested|in|on))/i,
    /\bheading\s+to\s+([a-z][a-z\s'.-]+?)(?:\?|$|\.|,|\s+(?:who|with|that|might|should|worth|interested|in|on))/i,
    /\bvisiting\s+([a-z][a-z\s'.-]+?)(?:\?|$|\.|,|\s+(?:who|with|that|might|should|worth|interested|in|on))/i,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (!match?.[1]) continue;
    const candidate = normalizeExtractedPhrase(match[1]);
    if (!isValidLocationFilter(candidate)) continue;
    return candidate;
  }

  return "";
}

function extractMemberInterestFromQuestion(question: string): string {
  const trimmed = question.trim();
  const interestMatch = trimmed.match(/interested in\s+([^?.!]+)/i)?.[1]?.trim() ?? "";
  if (interestMatch) return interestMatch.slice(0, 80);
  if (/\barchitecture\b/i.test(trimmed)) return "architecture";
  return "";
}

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

  if (
    /\bwho should i meet\b/i.test(trimmed) ||
    /\bwho should i connect with\b/i.test(trimmed) ||
    /\bwho shares\b/i.test(trimmed) ||
    /\bwho can i meet\b/i.test(trimmed) ||
    /\bworth connecting with\b/i.test(trimmed)
  ) {
    return "";
  }

  if (extractMemberLocationFromQuestion(trimmed)) {
    return "";
  }

  if (extractTravelDestinationFromQuestion(trimmed)) {
    return "";
  }

  return "";
}

export function buildCourseDirectoryFilters(question: string): CourseDirectoryFilters {
  const lower = question.toLowerCase();

  const locationMatch =
    lower.match(/\bin\s+([a-z\s'.-]+?)(?:\?|$|\.|,| who| with| interested| that)/i)?.[1]?.trim() ??
    "";

  let accessType: string | null = null;
  if (/\bprivate\b/i.test(lower)) accessType = "private";
  else if (/\bpublic\b/i.test(lower)) accessType = "public";

  let courseType: string | null = null;
  if (/\blinks\b/i.test(lower)) courseType = "links";

  let locationQuery = locationMatch;
  if (!locationQuery) {
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
    locationQuery: normalizeCourseLocationQuery(locationQuery),
    accessType,
    courseType,
  };
}

export function buildRetrievalFilters(question: string, intent: AiIntent) {
  if (intent === "find_courses") {
    if (isGlobalCourseRankingQuestion(question)) {
      return {
        courseQuery: "",
        courseDirectoryFilters: {
          locationQuery: "",
          accessType: null,
          courseType: null,
        },
        memberFilters: {},
      };
    }

    const directoryFilters = buildCourseDirectoryFilters(question);
    const courseQuery = directoryFilters.locationQuery || question.trim();
    return {
      courseQuery,
      courseDirectoryFilters: directoryFilters,
      memberFilters: {},
    };
  }

  return {
    courseQuery: "",
    courseDirectoryFilters: buildCourseDirectoryFilters(""),
    memberFilters: {
      query: extractMemberSearchQuery(question),
      location: extractMemberLocationFromQuestion(question),
      interest: extractMemberInterestFromQuestion(question),
      travel: extractTravelDestinationFromQuestion(question),
    },
  };
}

export function extractCourseNameFromQuestion(question: string): string | null {
  const trimmed = question.trim();

  const playedMatch = trimmed.match(/(?:played|play at|played at|playing)\s+(.+?)\??$/i);
  if (playedMatch?.[1]) {
    const name = normalizeCourseName(playedMatch[1]);
    if (isValidCourseNameFilter(name)) return name;
  }

  const opinionMatch = trimmed.match(/\b(?:think of|say about)\s+(.+?)\??$/i);
  if (opinionMatch?.[1]) {
    const name = normalizeCourseName(opinionMatch[1]);
    if (isValidCourseNameFilter(name)) return name;
  }

  const askAboutMatch = trimmed.match(/\bask about playing\s+(.+?)\??$/i);
  if (askAboutMatch?.[1]) {
    const name = normalizeCourseName(askAboutMatch[1]);
    if (isValidCourseNameFilter(name)) return name;
  }

  const introPatterns = [
    /\bhelp with an introduction at\s+(.+?)\??$/i,
    /\b(?:an?\s+)?introduction at\s+(.+?)\??$/i,
    /\bintroduction to\s+(.+?)\??$/i,
  ];

  for (const pattern of introPatterns) {
    const match = trimmed.match(pattern);
    if (!match?.[1]) continue;
    const name = normalizeCourseName(match[1]);
    if (isValidCourseNameFilter(name)) return name;
  }

  return null;
}

export function hasMeaningfulMemberFilters(
  memberFilters: MemberRetrievalFilters,
  courseName: string | null,
): boolean {
  if (courseName && isValidCourseNameFilter(courseName)) return true;
  if (memberFilters.query.trim()) return true;
  if (memberFilters.location.trim() && isValidLocationFilter(memberFilters.location)) return true;
  if (memberFilters.travel.trim() && isValidLocationFilter(memberFilters.travel)) return true;
  if (memberFilters.interest.trim()) return true;
  return false;
}

export function questionImpliesSpecificMemberCriteria(question: string): boolean {
  const trimmed = question.trim();
  if (!trimmed) return false;

  if (extractCourseNameFromQuestion(trimmed)) return true;
  if (extractTravelDestinationFromQuestion(trimmed)) return true;
  if (extractMemberLocationFromQuestion(trimmed)) return true;

  const interest = extractMemberInterestFromQuestion(trimmed);
  if (interest) return true;

  if (/\b(?:played|play at|played at)\s+\S/i.test(trimmed)) return true;
  if (/\bintroduction\s+at\s+/i.test(trimmed)) return true;
  if (/\bhelp with an introduction at\b/i.test(trimmed)) return true;

  if (/\b(members in|based in|around|near)\s+\S/i.test(trimmed)) return true;
  if (/\bin\s+(?!elitetee\b|the network\b)\S/i.test(trimmed)) return true;
  if (/\b(traveling|travelling|going|headed|heading|visiting)\s+(?:to\s+)?\S/i.test(trimmed)) {
    return true;
  }

  if (extractMemberSearchQuery(trimmed)) return true;

  for (const pattern of PRODUCT_CONTEXT_PHRASES) {
    if (pattern.test(trimmed) && extractTravelDestinationFromQuestion(trimmed)) {
      return true;
    }
  }

  return false;
}

export function isIntentionallyBroadMemberQuestion(question: string): boolean {
  const normalized = question.trim().toLowerCase().replace(/\?+$/, "").trim();

  const exactBroad = [
    "who should i connect with",
    "who should i meet",
    "who can i meet",
    "who shares my travel interests",
    "show all members",
  ];

  if (exactBroad.includes(normalized)) return true;
  if (/^(show|list|see|display|get)\s+(all\s+)?members?$/i.test(normalized)) return true;

  return !questionImpliesSpecificMemberCriteria(question);
}

export function shouldRejectBroadMemberRetrieval(
  question: string,
  memberFilters: MemberRetrievalFilters,
  courseName: string | null,
): boolean {
  if (isIntentionallyBroadMemberQuestion(question)) return false;
  if (!questionImpliesSpecificMemberCriteria(question)) return false;
  return !hasMeaningfulMemberFilters(memberFilters, courseName);
}
