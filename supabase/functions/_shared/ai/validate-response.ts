import type { AskEliteTeeResponse, RetrievedCourse, RetrievedMember } from "./types.ts";
import { FORBIDDEN_RESPONSE_KEYS } from "./types.ts";

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

  let answer = String(input.response.answer ?? "").trim();
  for (const key of FORBIDDEN_RESPONSE_KEYS) {
    if (answer.toLowerCase().includes(key)) {
      answer = "I can help using EliteTee member and course directory data only.";
      break;
    }
  }

  return { memberIds, courseIds, answer };
}

export function buildInsufficientDataResponse(intent: AskEliteTeeResponse["intent"]): AskEliteTeeResponse {
  return {
    status: "insufficient_data",
    intent,
    answer: "I don't have enough EliteTee data yet to answer that confidently.",
    sources: [],
    members: [],
    courses: [],
    reasons: [],
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
  const lower = question.toLowerCase();
  return (
    lower.includes("ignore previous") ||
    lower.includes("system prompt") ||
    lower.includes("reveal api key") ||
    lower.includes("service role")
  );
}
