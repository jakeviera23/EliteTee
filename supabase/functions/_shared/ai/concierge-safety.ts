import type { AskEliteTeeResponse } from "./types.ts";

export const CONCIERGE_PRIVATE_DATA_ANSWER =
  "Ask EliteTee can help with member profiles, golf activity, courses, travel, and introductions, but it can't provide private account information or private communications.";

export const CONCIERGE_INJECTION_ANSWER =
  "I can only use the member and course information EliteTee makes available to this concierge.";

export type ConciergeSafetyBlockKind = "private_data" | "prompt_injection";

export type ConciergeSafetyResult =
  | { blocked: false }
  | { blocked: true; kind: ConciergeSafetyBlockKind; answer: string };

const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /\bignore\s+(?:all\s+)?(?:previous|prior)\s+(?:instructions?|rules?|directives?)\b/i,
  /\bignore\s+your\s+rules?\b/i,
  /\b(?:reveal|show|print|dump|expose)\s+(?:your\s+)?(?:hidden|system|developer)\s+(?:instructions?|prompt|message)\b/i,
  /\bsystem\s+prompt\b/i,
  /\bdeveloper\s+message\b/i,
  /\bbypass\s+(?:your\s+)?(?:restrictions?|rules?|guardrails?|safety)\b/i,
  /\bshow\s+hidden\s+(?:data|member\s+data|information)\b/i,
  /\bpretend\s+(?:you\s+are|to\s+be)\s+unrestricted\b/i,
  /\b(?:reveal|show|print|dump|expose)\s+(?:the\s+)?(?:api\s+key|service\s+role)\b/i,
  /\b(?:without|ignore)\s+(?:restrictions?|limitations?|guardrails?)\b/i,
  /\bact\s+as\s+(?:if\s+you\s+have\s+)?no\s+(?:rules|restrictions|limitations)\b/i,
];

const PRIVATE_DATA_PATTERNS: RegExp[] = [
  /\b(?:every|all|any|each)\s+members?\s*(?:'s)?\s+(?:email|emails|email address(?:es)?|phone(?: number)?s?)\b/i,
  /\bgive\s+me\b.*\bmembers?\s*(?:'s)?\s+(?:email|emails|phone(?: number)?s?)\b/i,
  /\b(?:list|show|get|give|share|export|send)\b.*\bmembers?\s*(?:'s)?\s+(?:email|emails|phone(?: number)?s?)\b/i,
  /\bmembers?\s*(?:'s)?\s+(?:email|emails|phone(?: number)?s?)\b/i,
  /\bprivate\s+messages?\b/i,
  /\b(?:read|show|access|view|see|open)\b.*\b(?:private\s+messages?|direct\s+messages?|dms?|conversations?)\b/i,
  /\b(?:direct\s+message|dm)s?\b/i,
  /\binvite\s+tokens?\b/i,
  /\badmin\s+data\b/i,
  /\bhidden\s+profile\s+fields?\b/i,
  /\b(?:password|passwords|auth\s+tokens?|authentication\s+tokens?|secrets?|credentials?)\b/i,
];

function matchesAnyPattern(question: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(question));
}

function looksLikePrivateDataRequest(question: string): boolean {
  return matchesAnyPattern(question, PRIVATE_DATA_PATTERNS);
}

export function classifyConciergeSafetyQuestion(question: string): ConciergeSafetyResult {
  const trimmed = question.trim();
  if (!trimmed) return { blocked: false };

  if (matchesAnyPattern(trimmed, PROMPT_INJECTION_PATTERNS)) {
    return { blocked: true, kind: "prompt_injection", answer: CONCIERGE_INJECTION_ANSWER };
  }

  if (looksLikePrivateDataRequest(trimmed)) {
    return { blocked: true, kind: "private_data", answer: CONCIERGE_PRIVATE_DATA_ANSWER };
  }

  return { blocked: false };
}

export function buildUnsupportedSafetyResponse(
  result: Extract<ConciergeSafetyResult, { blocked: true }>,
): AskEliteTeeResponse {
  return {
    status: "unsupported",
    intent: "unsupported",
    answer: result.answer,
    sources: [],
    members: [],
    courses: [],
    reasons: [],
    followUps: [],
    query_id: null,
  };
}
