import { CONCIERGE_TOOL_DEFINITIONS } from "./concierge-tool-definitions.ts";
import type { ConciergeToolName } from "./concierge-tool-definitions.ts";
import type { ConciergeToolResult } from "./concierge-tools.ts";
import type {
  AiCompletionResult,
  AiIntent,
  AskEliteTeeStructuredReason,
  RetrievedCourse,
  RetrievedMember,
  RoundSummary,
} from "./types.ts";
import { sanitizeUntrustedText } from "./scoring.ts";

export type ConciergeToolTraceEntry = {
  tool: ConciergeToolName;
  args: Record<string, unknown>;
  result: ConciergeToolResult;
};

export type ConciergeSynthesisBundle = {
  question: string;
  intent: AiIntent;
  requestor: {
    user_id: string;
    full_name: string;
    based_in: string;
    traveling_to: string;
    golf_interests: string;
  } | null;
  members: Array<{
    user_id: string;
    full_name: string;
    primary_club: string;
    based_in: string;
    traveling_to: string;
    golf_interests: string;
    current_request: string;
  }>;
  courses: Array<{
    id: string;
    name: string;
    city: string | null;
    region: string | null;
    country: string | null;
    avg_rating: number | null;
    recommend_pct: number | null;
    round_count: number;
    member_count: number;
  }>;
  course_stats: Array<{
    course_id: string;
    course_name: string;
    avg_rating: number | null;
    recommend_pct: number | null;
    round_count: number;
    member_count: number;
  }>;
  round_summaries: Array<{
    user_id: string;
    course_name: string;
    location: string;
    played_on: string;
    course_rating: number;
    would_play_again: boolean;
  }>;
  tool_trace: Array<{ tool: ConciergeToolName; summary: string }>;
};

export type ConciergeStructuredModelResponse = {
  status?: "ok" | "needs_clarification" | "insufficient_data";
  answer?: string;
  memberIds?: string[];
  courseIds?: string[];
  reasons?: AskEliteTeeStructuredReason[];
  followUps?: string[];
};

export type ConciergeAgentRunResult = {
  intent: AiIntent;
  toolTrace: ConciergeToolTraceEntry[];
  modelResponse: ConciergeStructuredModelResponse;
  model: string;
  inputTokens: number;
  outputTokens: number;
  usedFallbackPlanner: boolean;
};

export interface ConciergeAgentDriver {
  runToolPlanning(input: {
    question: string;
    executeTool: (
      tool: ConciergeToolName,
      args: Record<string, unknown>,
    ) => Promise<ConciergeToolResult>;
    maxIterations?: number;
  }): Promise<{
    toolTrace: ConciergeToolTraceEntry[];
    needsClarification?: boolean;
    clarificationPrompt?: string;
    clarificationFollowUps?: string[];
  }>;

  synthesize(input: {
    bundle: ConciergeSynthesisBundle;
    maxOutputTokens: number;
    timeoutMs: number;
  }): Promise<AiCompletionResult>;
}

function readEnv(name: string): string | undefined {
  if (typeof Deno !== "undefined") {
    return Deno.env.get(name);
  }
  return process.env[name];
}

function getEnvInt(name: string, fallback: number) {
  const value = Number(readEnv(name));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function buildConciergeSynthesisBundle(input: {
  question: string;
  intent: AiIntent;
  requestor: RetrievedMember | null;
  members: RetrievedMember[];
  courses: RetrievedCourse[];
  courseStats: Array<{
    course_id: string;
    course_name: string;
    avg_rating: number | null;
    recommend_pct: number | null;
    round_count: number;
    member_count: number;
  }>;
  rounds: RoundSummary[];
  toolTrace: ConciergeToolTraceEntry[];
}): ConciergeSynthesisBundle {
  return {
    question: sanitizeUntrustedText(input.question, 500),
    intent: input.intent,
    requestor: input.requestor
      ? {
          user_id: input.requestor.user_id,
          full_name: sanitizeUntrustedText(input.requestor.full_name, 80),
          based_in: sanitizeUntrustedText(input.requestor.based_in, 80),
          traveling_to: sanitizeUntrustedText(input.requestor.traveling_to, 120),
          golf_interests: sanitizeUntrustedText(input.requestor.golf_interests, 160),
        }
      : null,
    members: input.members.slice(0, 8).map((member) => ({
      user_id: member.user_id,
      full_name: sanitizeUntrustedText(member.full_name, 80),
      primary_club: sanitizeUntrustedText(member.primary_club, 80),
      based_in: sanitizeUntrustedText(member.based_in, 80),
      traveling_to: sanitizeUntrustedText(member.traveling_to, 120),
      golf_interests: sanitizeUntrustedText(member.golf_interests, 160),
      current_request: sanitizeUntrustedText(member.current_request, 160),
    })),
    courses: input.courses.slice(0, 8).map((course) => ({
      id: course.id,
      name: sanitizeUntrustedText(course.name, 120),
      city: course.city,
      region: course.region,
      country: course.country,
      avg_rating: course.avg_rating,
      recommend_pct: course.recommend_pct,
      round_count: Number(course.round_count ?? 0),
      member_count: Number(course.member_count ?? 0),
    })),
    course_stats: input.courseStats.slice(0, 8),
    round_summaries: input.rounds.slice(0, 12).map((round) => ({
      user_id: round.user_id,
      course_name: sanitizeUntrustedText(round.course_name, 120),
      location: sanitizeUntrustedText(round.location, 120),
      played_on: round.played_on,
      course_rating: round.course_rating,
      would_play_again: round.would_play_again,
    })),
    tool_trace: input.toolTrace.map((entry) => ({
      tool: entry.tool,
      summary: entry.result.summary,
    })),
  };
}

export class OpenAiConciergeAgent implements ConciergeAgentDriver {
  async runToolPlanning(input: {
    question: string;
    executeTool: (
      tool: ConciergeToolName,
      args: Record<string, unknown>,
    ) => Promise<ConciergeToolResult>;
    maxIterations?: number;
  }) {
    const apiKey = Deno.env.get("OPENAI_API_KEY")?.trim();
    if (!apiKey) {
      throw new Error("OPENAI_NOT_CONFIGURED");
    }

    const model = Deno.env.get("AI_MODEL")?.trim() || "gpt-4o-mini";
    const maxIterations = input.maxIterations ?? 4;
    const toolTrace: ConciergeToolTraceEntry[] = [];
    const messages: Array<Record<string, unknown>> = [
      {
        role: "system",
        content: [
          "You are the Ask EliteTee planning layer.",
          "Choose one or more tools to answer the member question using EliteTee directory data only.",
          "Never guess member or course IDs.",
          "If the question is vague (for example 'a course' without naming one), stop and ask for clarification instead of calling broad member search.",
          "For ranking questions, use get_top_rated_courses.",
          "For who played X, resolve the course via get_members_who_played_course.",
          "For travel questions, use get_member_travel_matches.",
          "For location connection questions, use search_members with a location filter.",
        ].join(" "),
      },
      { role: "user", content: input.question },
    ];

    for (let iteration = 0; iteration < maxIterations; iteration += 1) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.1,
          max_tokens: 500,
          tools: CONCIERGE_TOOL_DEFINITIONS,
          tool_choice: "auto",
          messages,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OPENAI_HTTP_${response.status}:${errorText.slice(0, 180)}`);
      }

      const payload = await response.json();
      const message = payload?.choices?.[0]?.message;
      const toolCalls = message?.tool_calls ?? [];

      if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
        break;
      }

      messages.push(message);

      for (const call of toolCalls) {
        const tool = call?.function?.name as ConciergeToolName;
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(String(call?.function?.arguments ?? "{}")) as Record<string, unknown>;
        } catch {
          args = {};
        }

        const result = await input.executeTool(tool, args);
        toolTrace.push({ tool, args, result });

        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });

        if (result.needsClarification) {
          return {
            toolTrace,
            needsClarification: true,
            clarificationPrompt: result.clarificationPrompt,
          };
        }
      }
    }

    return { toolTrace };
  }

  async synthesize(input: {
    bundle: ConciergeSynthesisBundle;
    maxOutputTokens: number;
    timeoutMs: number;
  }): Promise<AiCompletionResult> {
    const apiKey = Deno.env.get("OPENAI_API_KEY")?.trim();
    if (!apiKey) {
      throw new Error("OPENAI_NOT_CONFIGURED");
    }

    const model = Deno.env.get("AI_MODEL")?.trim() || "gpt-4o-mini";
    const started = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), input.timeoutMs);

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          temperature: 0.2,
          max_tokens: input.maxOutputTokens,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: [
                "You are Ask EliteTee, a private member concierge.",
                "Use ONLY the retrieval bundle provided.",
                "Return JSON with keys: status, answer, memberIds, courseIds, reasons, followUps.",
                "status must be ok, needs_clarification, or insufficient_data.",
                "answer must be concise (1-3 short paragraphs max) with no raw JSON arrays or profile dumps.",
                "Choose at most 5 memberIds and 5 courseIds from the bundle.",
                "Every reason must reference actual retrieved facts.",
                "Never invent members, courses, ratings, travel, or relationships.",
              ].join(" "),
            },
            {
              role: "user",
              content: JSON.stringify(input.bundle),
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OPENAI_HTTP_${response.status}:${errorText.slice(0, 180)}`);
      }

      const payload = await response.json();
      const content = payload?.choices?.[0]?.message?.content;
      if (!content || typeof content !== "string") {
        throw new Error("OPENAI_EMPTY_RESPONSE");
      }

      let output: Record<string, unknown>;
      try {
        output = JSON.parse(content) as Record<string, unknown>;
      } catch {
        throw new Error("OPENAI_INVALID_JSON");
      }

      return {
        output,
        model,
        inputTokens: Number(payload?.usage?.prompt_tokens ?? 0),
        outputTokens: Number(payload?.usage?.completion_tokens ?? 0),
        latencyMs: Date.now() - started,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

export class MockConciergeAgent implements ConciergeAgentDriver {
  constructor(
    private readonly planner: (question: string) => {
      toolCalls: Array<{ tool: ConciergeToolName; args: Record<string, unknown> }>;
      needsClarification?: boolean;
      clarificationPrompt?: string;
      clarificationFollowUps?: string[];
    },
    private readonly synthesizer?: (bundle: ConciergeSynthesisBundle) => ConciergeStructuredModelResponse,
  ) {}

  async runToolPlanning(input: {
    question: string;
    executeTool: (
      tool: ConciergeToolName,
      args: Record<string, unknown>,
    ) => Promise<ConciergeToolResult>;
  }) {
    const plan = this.planner(input.question);
    if (plan.needsClarification) {
      return {
        toolTrace: [],
        needsClarification: true,
        clarificationPrompt: plan.clarificationPrompt,
        clarificationFollowUps: plan.clarificationFollowUps,
      };
    }

    const toolTrace: ConciergeToolTraceEntry[] = [];
    for (const call of plan.toolCalls) {
      const result = await input.executeTool(call.tool, call.args);
      toolTrace.push({ tool: call.tool, args: call.args, result });
      if (result.needsClarification) {
        return {
          toolTrace,
          needsClarification: true,
          clarificationPrompt: result.clarificationPrompt,
        };
      }
    }

    return { toolTrace };
  }

  async synthesize(input: { bundle: ConciergeSynthesisBundle }) {
    const structured = this.synthesizer?.(input.bundle) ?? {
      status: "ok" as const,
      answer: "Here are the closest matches from EliteTee directory data.",
      memberIds: input.bundle.members.slice(0, 3).map((member) => member.user_id),
      courseIds: input.bundle.courses.slice(0, 3).map((course) => course.id),
      reasons: [],
      followUps: [],
    };

    return {
      output: structured as Record<string, unknown>,
      model: "mock-concierge",
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: 0,
    };
  }
}

export function defaultSynthesisLimits() {
  return {
    maxOutputTokens: getEnvInt("AI_MAX_OUTPUT_TOKENS", 700),
    timeoutMs: getEnvInt("AI_REQUEST_TIMEOUT_MS", 15000),
  };
}
