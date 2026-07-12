import type { AiQueryStatus, AskEliteTeeReason } from "../types/askEliteTee";

export function getAskStatusLabel(status: AiQueryStatus): string | null {
  switch (status) {
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
  if (status === "insufficient_data") {
    return "I don't have enough EliteTee information yet to answer that confidently.";
  }

  return answer;
}

export function memberFacingAskError(message: string): string {
  const normalized = message.trim().toLowerCase();

  if (normalized.includes("rate") || normalized.includes("limit")) {
    return "You've reached today's Ask EliteTee limit. Please try again tomorrow.";
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
