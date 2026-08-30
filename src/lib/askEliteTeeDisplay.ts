import type { AiQueryStatus, AskEliteTeeReason } from "../types/askEliteTee";

export function getAskStatusLabel(status: AiQueryStatus): string | null {
  switch (status) {
    case "needs_clarification":
      return "Need a bit more detail";
    case "insufficient_data":
      return "Limited directory data";
    case "rate_limited":
      return "Daily limit reached";
    case "disabled":
      return "Temporarily unavailable";
    case "unsupported":
      return "Unsupported request";
    case "error":
      return "Could not complete";
    default:
      return null;
  }
}

export function getAskAnswerText(status: AiQueryStatus, answer: string): string {
  const trimmed = answer.trim();

  if (status === "insufficient_data") {
    return (
      trimmed ||
      "I don't have enough EliteTee information yet to answer that confidently."
    );
  }

  if (status === "needs_clarification") {
    return (
      trimmed ||
      "Which city, region, destination, course, or club should I focus on?"
    );
  }

  if (status === "rate_limited") {
    return trimmed || "Ask EliteTee has reached today's usage limit. Try again later.";
  }

  if (status === "disabled") {
    return trimmed || "Ask EliteTee is temporarily unavailable. Please try again later.";
  }

  if (status === "error") {
    return trimmed || "Ask EliteTee could not complete your request. Please try again.";
  }

  if (status === "unsupported") {
    return trimmed || "I can only help with EliteTee member and course discovery using approved directory data.";
  }

  return answer;
}

export function getAskStatusGuidance(status: AiQueryStatus): string[] | null {
  switch (status) {
    case "needs_clarification":
      return [
        "Name a specific city, region, destination, course, or club.",
        "Try one of the suggested follow-up questions below.",
      ];
    case "insufficient_data":
      return [
        "Name a city, region, destination, course, or club.",
        "Complete your profile with location, clubs, and interests.",
        "Explore members and courses manually while the directory grows.",
      ];
    case "rate_limited":
      return ["Try again later today or tomorrow."];
    case "disabled":
      return ["Try again later or explore Discover and Courses in the meantime."];
    case "error":
      return ["Try again in a moment or refine your question with a clearer location or course."];
    case "unsupported":
      return ["Ask about members, introductions, courses, or travel using EliteTee directory data."];
    default:
      return null;
  }
}

export function memberFacingAskError(message: string): string {
  const normalized = message.trim().toLowerCase();

  if (normalized.includes("rate") || normalized.includes("limit")) {
    return "Ask EliteTee has reached today's usage limit. Try again later.";
  }

  if (normalized.includes("signed in") || normalized.includes("auth")) {
    return "Please sign in to use Ask EliteTee.";
  }

  if (normalized.includes("disabled") || normalized.includes("unavailable")) {
    return "Ask EliteTee is temporarily unavailable. Please try again later.";
  }

  return "Ask EliteTee could not complete your request. Please try again.";
}

export function buildAskReasonMaps(reasons: AskEliteTeeReason[]) {
  const memberMap = new Map<string, string[]>();
  const courseMap = new Map<string, string[]>();

  for (const reason of reasons) {
    const map = reason.target_type === "member" ? memberMap : courseMap;
    map.set(reason.target_id, reason.signals);
  }

  return { memberMap, courseMap };
}

export function collectUniqueMatchSignals(reasons: AskEliteTeeReason[]): string[] {
  const seen = new Set<string>();
  const signals: string[] = [];

  for (const reason of reasons) {
    for (const signal of reason.signals) {
      if (!seen.has(signal)) {
        seen.add(signal);
        signals.push(signal);
      }
    }
  }

  return signals;
}
