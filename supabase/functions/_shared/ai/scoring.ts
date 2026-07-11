import type { RetrievedMember, RoundSummary, ScoredMember } from "./types.ts";

function parseListField(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    const inner = trimmed.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((item) => item.replace(/^"|"$/g, "").trim()).filter(Boolean);
  }

  return trimmed
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function overlapTokens(a: string, b: string): string[] {
  const left = new Set(parseListField(a).map((item) => item.toLowerCase()));
  const right = new Set(
    b
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2),
  );

  const matches: string[] = [];
  for (const token of left) {
    if (right.has(token)) matches.push(token);
  }
  return matches;
}

function locationOverlap(requestor: RetrievedMember, candidate: RetrievedMember): string[] {
  const signals: string[] = [];
  const requestorLocation = `${requestor.based_in} ${requestor.regions}`.toLowerCase();
  const candidateLocation = `${candidate.based_in} ${candidate.regions}`.toLowerCase();

  for (const token of requestorLocation.split(/[^a-z]+/).filter((part) => part.length > 2)) {
    if (candidateLocation.includes(token)) {
      signals.push(`Location overlap: ${token}`);
    }
  }

  return signals.slice(0, 2);
}

function travelOverlap(requestor: RetrievedMember, candidate: RetrievedMember): string[] {
  const requestorTravel = requestor.traveling_to.trim().toLowerCase();
  const candidateTravel = candidate.traveling_to.trim().toLowerCase();
  if (!requestorTravel || !candidateTravel) return [];

  const shared = overlapTokens(requestorTravel, candidateTravel);
  return shared.length > 0 ? [`Travel overlap: ${shared.join(", ")}`] : [];
}

function interestOverlap(requestor: RetrievedMember, candidate: RetrievedMember): string[] {
  const signals: string[] = [];
  const requestorInterests = `${requestor.golf_interests} ${requestor.business_interests} ${requestor.current_request}`;
  const candidateInterests = `${candidate.golf_interests} ${candidate.business_interests} ${candidate.current_request}`;

  const shared = overlapTokens(requestorInterests, candidateInterests);
  if (shared.length > 0) {
    signals.push(`Shared interests: ${shared.slice(0, 3).join(", ")}`);
  }

  return signals;
}

function sharedCourses(
  requestorId: string,
  candidateId: string,
  rounds: RoundSummary[],
): string[] {
  const requestorCourses = new Set(
    rounds.filter((round) => round.user_id === requestorId).map((round) => round.course_name.toLowerCase()),
  );
  const candidateCourses = rounds
    .filter((round) => round.user_id === candidateId)
    .map((round) => round.course_name.toLowerCase());

  const shared = candidateCourses.filter((course) => requestorCourses.has(course));
  if (shared.length === 0) return [];
  return [`Shared courses played: ${[...new Set(shared)].slice(0, 3).join(", ")}`];
}

export function scoreMemberMatch({
  requestor,
  candidate,
  rounds,
}: {
  requestor: RetrievedMember | null;
  candidate: RetrievedMember;
  rounds: RoundSummary[];
}): ScoredMember {
  const signals = new Set<string>();

  if (requestor) {
    for (const signal of locationOverlap(requestor, candidate)) signals.add(signal);
    for (const signal of travelOverlap(requestor, candidate)) signals.add(signal);
    for (const signal of interestOverlap(requestor, candidate)) signals.add(signal);
    for (const signal of sharedCourses(requestor.user_id, candidate.user_id, rounds)) {
      signals.add(signal);
    }

    if (
      requestor.primary_club &&
      candidate.primary_club &&
      requestor.primary_club.toLowerCase() === candidate.primary_club.toLowerCase()
    ) {
      signals.add(`Same home club: ${candidate.primary_club}`);
    }
  }

  if (candidate.current_request.trim()) {
    signals.add("Open connection request on profile");
  }

  const signalList = [...signals];
  const score = Math.min(100, 15 + signalList.length * 18);

  return {
    member: candidate,
    score,
    signals: signalList,
  };
}

export function rankMembers(
  requestor: RetrievedMember | null,
  candidates: RetrievedMember[],
  rounds: RoundSummary[],
  limit = 8,
): ScoredMember[] {
  return candidates
    .map((candidate) => scoreMemberMatch({ requestor, candidate, rounds }))
    .sort((left, right) => right.score - left.score || left.member.full_name.localeCompare(right.member.full_name))
    .slice(0, limit);
}

export function sanitizeUntrustedText(value: string, maxLength = 280): string {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}
