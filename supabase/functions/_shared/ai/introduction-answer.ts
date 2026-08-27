import type { RetrievedMember, ScoredMember } from "./types.ts";
import { expandMemberLocationSearchTerms } from "./member-location.ts";
import { sanitizeUntrustedText } from "./scoring.ts";

function fieldMentionsDestination(field: string, destination: string): boolean {
  const value = field.trim().toLowerCase();
  if (!value || !destination.trim()) return false;
  const terms = expandMemberLocationSearchTerms(destination);
  for (const term of terms) {
    const needle = term.toLowerCase();
    if (needle && value.includes(needle)) return true;
  }
  const dest = destination.trim().toLowerCase();
  return dest.length >= 2 && value.includes(dest);
}

function groundedReasons(member: RetrievedMember, destination: string, signals: string[]): string[] {
  const reasons: string[] = [];
  const basedIn = member.based_in?.trim() ?? "";
  const travelingTo = member.traveling_to?.trim() ?? "";
  const interests = member.golf_interests?.trim() ?? "";
  const request = member.current_request?.trim() ?? "";

  if (basedIn && (!destination || fieldMentionsDestination(basedIn, destination))) {
    reasons.push(`based in ${sanitizeUntrustedText(basedIn, 80)}`);
  }

  if (travelingTo && (!destination || fieldMentionsDestination(travelingTo, destination))) {
    reasons.push(`travel interests include ${sanitizeUntrustedText(travelingTo, 80)}`);
  }

  if (interests) {
    reasons.push(`golf interests include ${sanitizeUntrustedText(interests, 80)}`);
  }

  if (request) {
    reasons.push(`currently looking for ${sanitizeUntrustedText(request, 80)}`);
  }

  for (const signal of signals) {
    const cleaned = sanitizeUntrustedText(signal, 100);
    if (!cleaned) continue;
    if (reasons.some((reason) => reason.toLowerCase() === cleaned.toLowerCase())) continue;
    if (/^(location overlap|travel overlap|shared interests|same home club|open connection)/i.test(cleaned)) {
      reasons.push(cleaned);
    }
  }

  return reasons.slice(0, 3);
}

/**
 * Deterministic grounded introductions answer from scored retrieval only.
 * Never invents facts; returns "" when there are no candidates.
 */
export function buildIntroductionMembersAnswer(input: {
  destination?: string;
  scored: ScoredMember[];
}): string {
  const scored = input.scored.filter((entry) => entry.member?.user_id);
  if (scored.length === 0) return "";

  const destination = (input.destination ?? "").trim();
  const lines: string[] = [];

  for (const entry of scored.slice(0, 6)) {
    const member = entry.member;
    const name = sanitizeUntrustedText(member.full_name, 80) || "An EliteTee member";
    const reasons = groundedReasons(member, destination, entry.signals);

    let line = destination
      ? `${name} looks like a relevant connection for your ${sanitizeUntrustedText(destination, 40)} trip`
      : `${name} looks like a relevant connection`;

    if (reasons.length > 0) {
      line += ` because ${reasons.join("; ")}`;
    } else if (destination) {
      line += ` based on EliteTee directory matching for ${sanitizeUntrustedText(destination, 40)}`;
    } else {
      line += ` based on EliteTee directory data`;
    }
    line += ".";
    lines.push(line);
  }

  if (lines.length === 1) return lines[0]!;
  return `Here are EliteTee members who may be relevant:\n\n${lines.map((line) => `- ${line}`).join("\n")}`;
}

export function isGenericInsufficientDataAnswer(answer: string): boolean {
  const lower = answer.trim().toLowerCase();
  return (
    lower.includes("do not have enough elitetee data") ||
    lower.includes("don't have enough elitetee data") ||
    lower.includes("not enough elitetee data")
  );
}
