import type { AiIntent } from "./types.ts";
import type { RetrievedMember } from "./types.ts";
import {
  buildRetrievalFilters,
  extractCourseNameFromQuestion,
  hasMeaningfulMemberFilters,
  isGenericIntroductionPlaceholderQuestion,
  questionImpliesSpecificMemberCriteria,
  shouldRejectBroadMemberRetrieval,
  type MemberRetrievalFilters,
} from "./intent.ts";

export type MemberRetrievalRejectReason = "need_more_detail" | "no_data";

export type MemberRetrievalPlan = {
  memberFilters: MemberRetrievalFilters;
  courseName: string | null;
  requiresSpecificMatch: boolean;
  skipBroadMemberRpc: boolean;
  rejectReason: MemberRetrievalRejectReason | null;
};

export type MemberRetrievalGateResult =
  | { action: "reject"; reason: MemberRetrievalRejectReason; intent: AiIntent }
  | { action: "retrieve"; plan: MemberRetrievalPlan; intent: AiIntent };

function memberProfileText(member: RetrievedMember): string {
  return `${member.based_in ?? ""} ${member.regions ?? ""} ${member.traveling_to ?? ""}`.toLowerCase();
}

function profileMatchesToken(member: RetrievedMember, token: string): boolean {
  const normalized = token.trim().toLowerCase();
  if (!normalized) return true;
  return memberProfileText(member).includes(normalized);
}

export function planMemberRetrieval(question: string, intent: AiIntent): MemberRetrievalPlan {
  const memberFilters = buildRetrievalFilters(question, intent).memberFilters as MemberRetrievalFilters;
  const courseName = extractCourseNameFromQuestion(question);
  const requiresSpecificMatch = questionImpliesSpecificMemberCriteria(question);
  const courseLedSpecificQuery = Boolean(courseName) && requiresSpecificMatch;

  let rejectReason: MemberRetrievalRejectReason | null = null;

  if (isGenericIntroductionPlaceholderQuestion(question)) {
    rejectReason = "need_more_detail";
  } else if (shouldRejectBroadMemberRetrieval(question, memberFilters, courseName)) {
    rejectReason = "need_more_detail";
  }

  return {
    memberFilters,
    courseName,
    requiresSpecificMatch,
    skipBroadMemberRpc: courseLedSpecificQuery,
    rejectReason,
  };
}

export function evaluateMemberRetrievalGate(question: string, intent: AiIntent): MemberRetrievalGateResult {
  const plan = planMemberRetrieval(question, intent);

  if (plan.rejectReason) {
    return { action: "reject", reason: plan.rejectReason, intent };
  }

  return { action: "retrieve", plan, intent };
}

export function filterMembersByRetrievalCriteria(
  members: RetrievedMember[],
  plan: MemberRetrievalPlan,
  courseMemberIds?: Set<string>,
): RetrievedMember[] {
  let filtered = members;

  if (plan.courseName) {
    if (!courseMemberIds || courseMemberIds.size === 0) {
      return [];
    }
    filtered = filtered.filter((member) => courseMemberIds.has(member.user_id));
  }

  const location = plan.memberFilters.location.trim();
  const travel = plan.memberFilters.travel.trim();

  if (location) {
    filtered = filtered.filter((member) => profileMatchesToken(member, location));
  }

  if (travel) {
    filtered = filtered.filter((member) => profileMatchesToken(member, travel));
  }

  return filtered;
}

export function shouldReturnInsufficientAfterMemberRetrieval(
  question: string,
  plan: MemberRetrievalPlan,
  members: RetrievedMember[],
): MemberRetrievalRejectReason | null {
  if (!plan.requiresSpecificMatch || members.length > 0) {
    return null;
  }

  if (
    isGenericIntroductionPlaceholderQuestion(question) ||
    !hasMeaningfulMemberFilters(plan.memberFilters, plan.courseName)
  ) {
    return "need_more_detail";
  }

  return "no_data";
}
