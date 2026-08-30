import type {
  AiIntent,
  AskEliteTeeResponse,
  RetrievedCourse,
  RetrievedMember,
  AskEliteTeeStructuredReason,
} from "./types.ts";
import { FORBIDDEN_RESPONSE_KEYS } from "./types.ts";
import { classifyConciergeSafetyQuestion } from "./concierge-safety.ts";

export const MAX_CONCIERGE_RECOMMENDATIONS = 5;

function dedupePreserveOrder(ids: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

export function validateModelResponseIds(input: {
  response: {
    answer?: string;
    member_user_ids?: string[];
    course_ids?: string[];
  };
  allowedMemberIds: Set<string>;
  allowedCourseIds: Set<string>;
}): { memberIds: string[]; courseIds: string[]; answer: string } {
  const memberIds = (input.response.member_user_ids ?? []).filter((id) =>
    input.allowedMemberIds.has(id),
  );
  const courseIds = (input.response.course_ids ?? []).filter((id) =>
    input.allowedCourseIds.has(id),
  );

  let answer = sanitizeAnswerProse(String(input.response.answer ?? "").trim());

  return { memberIds, courseIds, answer };
}

export function validateConciergeStructuredResponse(input: {
  response: {
    status?: string;
    answer?: string;
    memberIds?: string[];
    courseIds?: string[];
    reasons?: AskEliteTeeStructuredReason[];
    followUps?: string[];
  };
  allowedMemberIds: Set<string>;
  allowedCourseIds: Set<string>;
  maxRecommendations?: number;
}): {
  status: AskEliteTeeResponse["status"];
  answer: string;
  memberIds: string[];
  courseIds: string[];
  reasons: AskEliteTeeStructuredReason[];
  followUps: string[];
} {
  const max = input.maxRecommendations ?? MAX_CONCIERGE_RECOMMENDATIONS;
  const memberIds = dedupePreserveOrder(
    (input.response.memberIds ?? []).filter((id) => input.allowedMemberIds.has(id)),
  ).slice(0, max);
  const courseIds = dedupePreserveOrder(
    (input.response.courseIds ?? []).filter((id) => input.allowedCourseIds.has(id)),
  ).slice(0, max);

  const allowedEntityIds = new Set([
    ...memberIds.map((id) => `member:${id}`),
    ...courseIds.map((id) => `course:${id}`),
  ]);

  const reasons = (input.response.reasons ?? [])
    .filter((reason) => {
      const key = `${reason.entityType}:${reason.entityId}`;
      return allowedEntityIds.has(key);
    })
    .slice(0, max);

  const status = normalizeConciergeStatus(input.response.status, memberIds, courseIds);
  const followUps = (input.response.followUps ?? [])
    .map((entry) => String(entry).trim())
    .filter(Boolean)
    .slice(0, 3);

  return {
    status,
    answer: sanitizeAnswerProse(String(input.response.answer ?? "").trim(), status),
    memberIds,
    courseIds,
    reasons,
    followUps,
  };
}

function normalizeConciergeStatus(
  rawStatus: string | undefined,
  memberIds: string[],
  courseIds: string[],
): AskEliteTeeResponse["status"] {
  if (rawStatus === "needs_clarification") return "needs_clarification";
  if (rawStatus === "insufficient_data") return "insufficient_data";
  if (memberIds.length === 0 && courseIds.length === 0) return "insufficient_data";
  return "ok";
}

export function sanitizeAnswerProse(answer: string, status?: AskEliteTeeResponse["status"]): string {
  let sanitized = answer.trim();

  if (!sanitized) {
    if (status === "needs_clarification") {
      return "Which city, region, destination, course, or club should I focus on?";
    }
    return "I can help using EliteTee member and course directory data only.";
  }

  if (/^\s*[\[{]/.test(sanitized) || sanitized.includes('"user_id"')) {
    sanitized = "Here are the closest matches from EliteTee directory data.";
  }

  if (sanitized.length > 1200) {
    sanitized = `${sanitized.slice(0, 1197).trim()}...`;
  }

  for (const key of FORBIDDEN_RESPONSE_KEYS) {
    if (sanitized.toLowerCase().includes(key)) {
      sanitized = "I can help using EliteTee member and course directory data only.";
      break;
    }
  }

  return sanitized;
}

export type InsufficientDataReason = "no_data" | "need_more_detail";

export function buildInsufficientDataResponse(
  intent: AskEliteTeeResponse["intent"],
  reason: InsufficientDataReason = "no_data",
): AskEliteTeeResponse {
  const answer =
    reason === "need_more_detail"
      ? "I need a little more detail to search the network. Try naming a city, destination, course, or club."
      : "I don't have enough EliteTee data yet to answer that confidently.";

  return {
    status: "insufficient_data",
    intent,
    answer,
    sources: [],
    members: [],
    courses: [],
    reasons: [],
    followUps: [],
    query_id: null,
  };
}

export function buildNeedsClarificationResponse(
  intent: AskEliteTeeResponse["intent"],
  answer: string,
  followUps: string[] = [],
): AskEliteTeeResponse {
  return {
    status: "needs_clarification",
    intent,
    answer: sanitizeAnswerProse(answer, "needs_clarification"),
    sources: [],
    members: [],
    courses: [],
    reasons: [],
    followUps: followUps.slice(0, 3),
    query_id: null,
  };
}

export function mapMembersById(members: RetrievedMember[], ids: string[]) {
  const map = new Map(members.map((member) => [member.user_id, member]));
  return ids.map((id) => map.get(id)).filter(Boolean) as RetrievedMember[];
}

export function mapCoursesById(courses: RetrievedCourse[], ids: string[]) {
  const map = new Map(courses.map((course) => [course.id, course]));
  return ids.map((id) => map.get(id)).filter(Boolean) as RetrievedCourse[];
}

export function containsPromptInjectionAttempt(question: string): boolean {
  return classifyConciergeSafetyQuestion(question).blocked;
}
