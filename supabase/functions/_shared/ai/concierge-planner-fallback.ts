import type { ConciergeToolName } from "./concierge-tool-definitions.ts";
import {
  extractCourseNameFromQuestion,
  extractMemberLocationFromQuestion,
  extractTravelDestinationFromQuestion,
  isGenericIntroductionPlaceholderQuestion,
  isGlobalCourseRankingQuestion,
} from "./intent.ts";

export type ConciergeToolCallPlan = {
  tool: ConciergeToolName;
  args: Record<string, unknown>;
};

export type ConciergeFallbackPlan = {
  intent: "find_members" | "find_courses" | "recommend_introductions";
  toolCalls: ConciergeToolCallPlan[];
  needsClarification?: boolean;
  clarificationPrompt?: string;
  clarificationFollowUps?: string[];
};

function extractRegionFromRankingQuestion(question: string): string {
  const match = question.match(/\bin\s+([a-z][a-z\s'.-]+?)(?:\?|$|\.|,|\s+who|\s+and)/i);
  return match?.[1]?.trim() ?? "";
}

function isCourseOpinionQuestion(question: string): boolean {
  return (
    /\bwhat do members think\b/i.test(question) ||
    /\bwhat did members say\b/i.test(question) ||
    /\bmembers think of\b/i.test(question) ||
    /\bmembers say about\b/i.test(question)
  );
}

function isCompoundTravelAndConnectionQuestion(question: string): boolean {
  const lower = question.toLowerCase();
  const hasTravel = /\b(traveling|travelling|going|headed|heading|visiting)\b/i.test(question);
  const asksAboutCourses = /\bcourses?\b/i.test(lower);
  const asksAboutConnections =
    /\bconnect\b/i.test(lower) || /\bwho should i\b/i.test(lower) || /\bwho can i\b/i.test(lower);
  const compound = lower.includes(" and ") || (asksAboutCourses && asksAboutConnections);
  return hasTravel && asksAboutCourses && compound;
}

export function planConciergeToolsFallback(question: string): ConciergeFallbackPlan {
  const trimmed = question.trim();

  if (isGenericIntroductionPlaceholderQuestion(trimmed)) {
    return {
      intent: "recommend_introductions",
      toolCalls: [],
      needsClarification: true,
      clarificationPrompt: "Which course or destination do you have in mind?",
      clarificationFollowUps: [
        "Who can help with an introduction at Augusta National?",
        "Who should I connect with in Palm Beach?",
      ],
    };
  }

  if (isGlobalCourseRankingQuestion(trimmed)) {
    return {
      intent: "find_courses",
      toolCalls: [{ tool: "get_top_rated_courses", args: { limit: 8 } }],
    };
  }

  const rankingRegion = extractRegionFromRankingQuestion(trimmed);
  if (
    rankingRegion &&
    (/\bbest courses\b/i.test(trimmed) ||
      /\bhighest rated\b/i.test(trimmed) ||
      /\bmembers have reviewed\b/i.test(trimmed))
  ) {
    return {
      intent: "find_courses",
      toolCalls: [{ tool: "get_top_rated_courses", args: { region: rankingRegion, limit: 8 } }],
    };
  }

  if (isCourseOpinionQuestion(trimmed)) {
    const courseName = extractCourseNameFromQuestion(trimmed);
    return {
      intent: "find_courses",
      toolCalls: courseName
        ? [{ tool: "get_course_member_stats", args: { course_name: courseName } }]
        : [{ tool: "get_course_member_stats", args: { course_name: "" } }],
    };
  }

  const courseName = extractCourseNameFromQuestion(trimmed);
  if (courseName) {
    if (
      /\bwho has played\b/i.test(trimmed) ||
      /\bwho have played\b/i.test(trimmed) ||
      /\bwho played\b/i.test(trimmed) ||
      /\bmembers have played\b/i.test(trimmed)
    ) {
      return {
        intent: "find_members",
        toolCalls: [{ tool: "get_members_who_played_course", args: { course_name: courseName, limit: 8 } }],
      };
    }

    if (/\bwho should i ask\b/i.test(trimmed) || /\bintroduction at\b/i.test(trimmed)) {
      return {
        intent: "recommend_introductions",
        toolCalls: [{ tool: "get_members_who_played_course", args: { course_name: courseName, limit: 5 } }],
      };
    }
  }

  const travel = extractTravelDestinationFromQuestion(trimmed);
  if (travel) {
    if (isCompoundTravelAndConnectionQuestion(trimmed)) {
      return {
        intent: "recommend_introductions",
        toolCalls: [
          { tool: "get_top_rated_courses", args: { region: travel, limit: 5 } },
          { tool: "get_member_travel_matches", args: { destination: travel, limit: 5 } },
        ],
      };
    }

    return {
      intent: "find_members",
      toolCalls: [{ tool: "get_member_travel_matches", args: { destination: travel, limit: 8 } }],
    };
  }

  const location = extractMemberLocationFromQuestion(trimmed);
  if (location) {
    return {
      intent: "recommend_introductions",
      toolCalls: [{ tool: "search_members", args: { location, limit: 8 } }],
    };
  }

  if (/\bcourse\b/i.test(trimmed) && !courseName) {
    return {
      intent: "recommend_introductions",
      toolCalls: [],
      needsClarification: true,
      clarificationPrompt: "Which course or destination do you have in mind?",
      clarificationFollowUps: ["Who can help with an introduction at Cypress Point?"],
    };
  }

  return {
    intent: "recommend_introductions",
    toolCalls: [],
    needsClarification: true,
    clarificationPrompt: "Which city, region, destination, course, or club should I focus on?",
    clarificationFollowUps: [
      "Who should I connect with in Palm Beach?",
      "Which courses have EliteTee members rated highest?",
    ],
  };
}
