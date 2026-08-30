import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { buildDeterministicConciergeResponse } from "./concierge-deterministic-synthesis.ts";
import {
  buildUnsupportedSafetyResponse,
  classifyConciergeSafetyQuestion,
} from "./concierge-safety.ts";
import { planConciergeToolsFallback } from "./concierge-planner-fallback.ts";
import {
  createConciergeToolStore,
  executeConciergeTool,
  type ConciergeToolDeps,
} from "./concierge-tools.ts";
import {
  buildConciergeSynthesisBundle,
  defaultSynthesisLimits,
  OpenAiConciergeAgent,
  type ConciergeAgentDriver,
  type ConciergeStructuredModelResponse,
} from "./openai-agent.ts";
import { classifyIntent, isSelfIdentityQuestion } from "./intent.ts";
import { rankMembers } from "./scoring.ts";
import {
  buildInsufficientDataResponse,
  buildNeedsClarificationResponse,
  mapCoursesById,
  mapMembersById,
  validateConciergeStructuredResponse,
} from "./validate-response.ts";
import type {
  AiIntent,
  AiQueryStatus,
  AskEliteTeeResponse,
  RetrievedMember,
  RoundSummary,
} from "./types.ts";

export type ConciergeOrchestratorInput = {
  supabase: SupabaseClient;
  viewerId: string;
  question: string;
  explicitIntent?: AiIntent;
  requestor: RetrievedMember | null;
  pendingIntroUserIds: Set<string>;
  agent?: ConciergeAgentDriver;
};

export type ConciergeOrchestratorResult = AskEliteTeeResponse & {
  model: string;
  inputTokens: number;
  outputTokens: number;
  errorCode: string | null;
  logStatus: AiQueryStatus;
};

function inferIntentFromTools(
  explicitIntent: AiIntent | undefined,
  fallbackIntent: AiIntent,
  question: string,
  hasMembers: boolean,
  hasCourses: boolean,
): AiIntent {
  if (explicitIntent && explicitIntent !== "unsupported") return explicitIntent;
  if (fallbackIntent !== "find_members") return fallbackIntent;
  if (hasMembers && !hasCourses) return "recommend_introductions";
  if (hasCourses && !hasMembers) return "find_courses";
  if (hasMembers && hasCourses) return "recommend_introductions";
  return classifyIntent(question, explicitIntent);
}

export async function runConciergeOrchestrator(
  input: ConciergeOrchestratorInput,
): Promise<ConciergeOrchestratorResult> {
  const question = input.question.trim();

  const safety = classifyConciergeSafetyQuestion(question);
  if (safety.blocked) {
    const blocked = buildUnsupportedSafetyResponse(safety);
    return {
      ...blocked,
      model: "deterministic",
      inputTokens: 0,
      outputTokens: 0,
      errorCode: safety.kind === "prompt_injection" ? "PROMPT_INJECTION" : "PRIVATE_DATA_REQUEST",
      logStatus: "unsupported",
    };
  }

  const fallbackPlan = planConciergeToolsFallback(question);

  if (isSelfIdentityQuestion(question)) {
    if (!input.requestor) {
      const insufficient = buildInsufficientDataResponse("find_members");
      return {
        ...insufficient,
        followUps: [],
        model: "deterministic",
        inputTokens: 0,
        outputTokens: 0,
        errorCode: "NO_REQUESTOR_PROFILE",
        logStatus: "insufficient_data",
      };
    }

    const selfAnswer = [
      `You are ${input.requestor.full_name || "an EliteTee member"}.`,
      input.requestor.primary_club ? `Primary club: ${input.requestor.primary_club}.` : "",
      input.requestor.based_in ? `Based in: ${input.requestor.based_in}.` : "",
      input.requestor.traveling_to ? `Traveling to: ${input.requestor.traveling_to}.` : "",
    ]
      .filter(Boolean)
      .join(" ");

    return {
      status: "ok",
      intent: "find_members",
      answer: selfAnswer,
      sources: ["Member profiles"],
      members: [],
      courses: [],
      reasons: [],
      followUps: [],
      query_id: null,
      model: "deterministic",
      inputTokens: 0,
      outputTokens: 0,
      errorCode: null,
      logStatus: "ok",
    };
  }

  if (fallbackPlan.needsClarification && fallbackPlan.toolCalls.length === 0) {
    const clarification = buildNeedsClarificationResponse(
      fallbackPlan.intent,
      fallbackPlan.clarificationPrompt ??
        "Which city, region, destination, course, or club should I focus on?",
      fallbackPlan.clarificationFollowUps ?? [],
    );
    return {
      ...clarification,
      model: "deterministic",
      inputTokens: 0,
      outputTokens: 0,
      errorCode: "NEEDS_CLARIFICATION",
      logStatus: "needs_clarification",
    };
  }

  const store = createConciergeToolStore();
  const deps: ConciergeToolDeps = {
    supabase: input.supabase,
    viewerId: input.viewerId,
    pendingIntroUserIds: input.pendingIntroUserIds,
    question,
  };

  const executeTool = (tool: Parameters<typeof executeConciergeTool>[0], args: Record<string, unknown>) =>
    executeConciergeTool(tool, args, deps, store);

  let agent = input.agent ?? new OpenAiConciergeAgent();
  let usedFallbackPlanner = false;
  let toolTrace: Awaited<ReturnType<ConciergeAgentDriver["runToolPlanning"]>> = { toolTrace: [] };
  let model = "openai-concierge";
  let inputTokens = 0;
  let outputTokens = 0;
  let errorCode: string | null = null;

  try {
    toolTrace = await agent.runToolPlanning({
      question,
      executeTool,
      maxIterations: 4,
    });
  } catch (error) {
    errorCode = error instanceof Error ? error.message.slice(0, 120) : "AI_PROVIDER_ERROR";
    usedFallbackPlanner = true;
    agent = new OpenAiConciergeAgent();

    if (fallbackPlan.needsClarification && fallbackPlan.toolCalls.length === 0) {
      const clarification = buildNeedsClarificationResponse(
        fallbackPlan.intent,
        fallbackPlan.clarificationPrompt ??
          "Which city, region, destination, course, or club should I focus on?",
        fallbackPlan.clarificationFollowUps ?? [],
      );
      return {
        ...clarification,
        model: "deterministic",
        inputTokens: 0,
        outputTokens: 0,
        errorCode,
        logStatus: "needs_clarification",
      };
    }

    toolTrace = { toolTrace: [] };
    for (const call of fallbackPlan.toolCalls) {
      const result = await executeTool(call.tool, call.args);
      toolTrace.toolTrace.push({ tool: call.tool, args: call.args, result });
      if (result.needsClarification) {
        const clarification = buildNeedsClarificationResponse(
          fallbackPlan.intent,
          result.clarificationPrompt ??
            "Which city, region, destination, course, or club should I focus on?",
          fallbackPlan.clarificationFollowUps ?? [],
        );
        return {
          ...clarification,
          model: "deterministic",
          inputTokens: 0,
          outputTokens: 0,
          errorCode,
          logStatus: "needs_clarification",
        };
      }
    }
  }

  if (toolTrace.needsClarification) {
    const clarification = buildNeedsClarificationResponse(
      fallbackPlan.intent,
      toolTrace.clarificationPrompt ??
        "Which city, region, destination, course, or club should I focus on?",
      toolTrace.clarificationFollowUps ?? fallbackPlan.clarificationFollowUps ?? [],
    );
    return {
      ...clarification,
      model: usedFallbackPlanner ? "deterministic" : model,
      inputTokens,
      outputTokens,
      errorCode: errorCode ?? "NEEDS_CLARIFICATION",
      logStatus: "needs_clarification",
    };
  }

  if (toolTrace.toolTrace.length === 0 && fallbackPlan.toolCalls.length > 0) {
    for (const call of fallbackPlan.toolCalls) {
      const result = await executeTool(call.tool, call.args);
      toolTrace.toolTrace.push({ tool: call.tool, args: call.args, result });
    }
  }

  const members = [...store.members.values()];
  const courses = [...store.courses.values()];
  const courseStats = [...store.courseStats.values()];

  if (members.length === 0 && courses.length === 0 && courseStats.length === 0) {
    const insufficient = buildInsufficientDataResponse(fallbackPlan.intent);
    return {
      ...insufficient,
      followUps: [],
      model: usedFallbackPlanner ? "deterministic" : model,
      inputTokens,
      outputTokens,
      errorCode: errorCode ?? "NO_DATA",
      logStatus: "insufficient_data",
    };
  }

  let rounds: RoundSummary[] = store.rounds;
  if (members.length > 0 && rounds.length === 0) {
    const memberIds = members.map((member) => member.user_id);
    const { data: roundRows } = await input.supabase.rpc("ai_member_round_summary", {
      p_user_ids: memberIds,
    });
    rounds = (roundRows ?? []) as RoundSummary[];
    if (rounds.length > 0) store.sources.add("Member reviews");
  }

  const intent = inferIntentFromTools(
    input.explicitIntent,
    fallbackPlan.intent,
    question,
    members.length > 0,
    courses.length > 0,
  );
  const scored = input.requestor && members.length > 0
    ? rankMembers(input.requestor, members, rounds, 8)
    : members.map((member) => ({ member, score: 0, signals: [] as string[] }));

  const synthesisBundle = buildConciergeSynthesisBundle({
    question,
    intent,
    requestor: input.requestor,
    members: scored.map((entry) => entry.member),
    courses,
    courseStats,
    rounds,
    toolTrace: toolTrace.toolTrace,
  });

  let structured: ConciergeStructuredModelResponse;
  const limits = defaultSynthesisLimits();

  try {
    const completion = await agent.synthesize({
      bundle: synthesisBundle,
      maxOutputTokens: limits.maxOutputTokens,
      timeoutMs: limits.timeoutMs,
    });
    model = completion.model;
    inputTokens += completion.inputTokens;
    outputTokens += completion.outputTokens;
    structured = completion.output as ConciergeStructuredModelResponse;
  } catch (error) {
    errorCode = error instanceof Error ? error.message.slice(0, 120) : "AI_PROVIDER_ERROR";
    structured = buildDeterministicConciergeResponse({
      question,
      toolTrace: toolTrace.toolTrace,
      members: scored.map((entry) => entry.member),
      courses,
      courseStats,
    });
    model = "deterministic";
  }

  const validated = validateConciergeStructuredResponse({
    response: structured,
    allowedMemberIds: new Set(members.map((member) => member.user_id)),
    allowedCourseIds: new Set(courses.map((course) => course.id)),
    maxRecommendations: 5,
  });

  let status: AiQueryStatus = validated.status;
  if (status === "ok" && validated.memberIds.length === 0 && validated.courseIds.length === 0) {
    status = "insufficient_data";
  }

  const responseMembers = mapMembersById(members, validated.memberIds);
  const responseCourses = mapCoursesById(courses, validated.courseIds);

  const signalReasonMap = new Map(
    scored.map((entry) => [entry.member.user_id, entry.signals] as const),
  );

  const reasons = validated.reasons.length > 0
    ? validated.reasons.map((reason) => ({
        target_id: reason.entityId,
        target_type: reason.entityType,
        signals: [reason.reason],
      }))
    : validated.memberIds
      .map((memberId) => ({
        target_id: memberId,
        target_type: "member" as const,
        signals: signalReasonMap.get(memberId) ?? [],
      }))
      .filter((reason) => reason.signals.length > 0);

  return {
    status,
    intent,
    answer: validated.answer,
    sources: [...store.sources],
    members: responseMembers,
    courses: responseCourses,
    reasons,
    followUps: validated.followUps,
    query_id: null,
    model,
    inputTokens,
    outputTokens,
    errorCode,
    logStatus: status,
  };
}

export function mapOrchestratorLogStatus(status: AiQueryStatus): AiQueryStatus {
  return status === "needs_clarification" ? "insufficient_data" : status;
}
