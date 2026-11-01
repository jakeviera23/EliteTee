import { getCurrentAuthUserId } from "./authUserLinking";
import { fetchIntroductionRequests } from "./introductionRequests";
import { extractDirectMessageParticipantUserIds, fetchDirectPrivateMessages } from "./privateMessages";
import { supabase } from "./supabase";
import type { IntroductionRequestRecord } from "../types/introductionRequest";

export const INTRODUCTION_MESSAGE_MIN_LENGTH = 20;

export type MemberRelationshipState =
  | "none"
  | "pending_sent"
  | "pending_received"
  | "connected";

export type MemberIntroductionAction =
  | "request_introduction"
  | "pending_sent"
  | "respond_to_request"
  | "introduced";

export type MemberIntroductionCta = {
  action: MemberIntroductionAction;
  label: string;
  /** Status-only states render as a non-interactive badge. */
  disabled?: boolean;
};

export type MemberRelationshipContext = {
  currentUserId: string;
  introductionRequests: IntroductionRequestRecord[];
  directThreadUserIds: Set<string>;
};

export function normalizeRelationshipStatus(status: string): string {
  return status.trim().toLowerCase();
}

export function filterIntroductionRequestsForPair(
  currentUserId: string,
  otherUserId: string,
  requests: IntroductionRequestRecord[],
): IntroductionRequestRecord[] {
  return requests.filter(
    (request) =>
      (request.sender_id === currentUserId && request.receiver_id === otherUserId) ||
      (request.sender_id === otherUserId && request.receiver_id === currentUserId),
  );
}

export function resolveMemberRelationshipState(
  currentUserId: string,
  otherUserId: string,
  requests: IntroductionRequestRecord[],
): MemberRelationshipState {
  const pairRequests = filterIntroductionRequestsForPair(currentUserId, otherUserId, requests);

  if (pairRequests.some((request) => normalizeRelationshipStatus(request.status) === "accepted")) {
    return "connected";
  }

  const pendingRequest = pairRequests.find(
    (request) => normalizeRelationshipStatus(request.status) === "pending",
  );

  if (!pendingRequest) {
    return "none";
  }

  return pendingRequest.sender_id === currentUserId ? "pending_sent" : "pending_received";
}

export function findPendingIntroductionRequestForPair(
  currentUserId: string,
  otherUserId: string,
  requests: IntroductionRequestRecord[],
): IntroductionRequestRecord | null {
  return (
    filterIntroductionRequestsForPair(currentUserId, otherUserId, requests).find(
      (request) => normalizeRelationshipStatus(request.status) === "pending",
    ) ?? null
  );
}

export function membersAreConnected(
  currentUserId: string,
  otherUserId: string,
  requests: IntroductionRequestRecord[],
): boolean {
  return resolveMemberRelationshipState(currentUserId, otherUserId, requests) === "connected";
}

export function hasExistingDirectMessageThread(
  otherUserId: string,
  directThreadUserIds: Set<string>,
): boolean {
  return directThreadUserIds.has(otherUserId);
}

/**
 * Approved portal members may message each other directly (migration 074).
 * Introductions are an optional, formal layer and never gate messaging;
 * the database still enforces portal access for both members.
 */
export function canDirectMessageMember(currentUserId: string, otherUserId: string): boolean {
  return Boolean(currentUserId && otherUserId && currentUserId !== otherUserId);
}

export function resolveMemberIntroductionCtaForPair(
  currentUserId: string,
  otherUserId: string,
  context: Pick<MemberRelationshipContext, "introductionRequests">,
  options?: { compact?: boolean },
): MemberIntroductionCta {
  return resolveMemberIntroductionCta(
    resolveMemberRelationshipState(currentUserId, otherUserId, context.introductionRequests),
    options,
  );
}

export function resolveMemberIntroductionCta(
  state: MemberRelationshipState,
  options?: { compact?: boolean },
): MemberIntroductionCta {
  const compact = options?.compact ?? false;

  switch (state) {
    case "pending_sent":
      return {
        action: "pending_sent",
        label: compact ? "Requested" : "Introduction Requested",
        disabled: true,
      };
    case "pending_received":
      return {
        action: "respond_to_request",
        label: compact ? "Respond" : "Respond to Introduction",
      };
    case "connected":
      return {
        action: "introduced",
        label: "Introduced",
        disabled: true,
      };
    case "none":
    default:
      return {
        action: "request_introduction",
        label: compact ? "Introduce" : "Request Introduction",
      };
  }
}

export function countMemberConnections(
  currentUserId: string,
  requests: IntroductionRequestRecord[],
): number {
  const connectedMemberIds = new Set<string>();

  for (const request of requests) {
    if (normalizeRelationshipStatus(request.status) !== "accepted") continue;
    if (request.sender_id !== currentUserId && request.receiver_id !== currentUserId) continue;

    const otherUserId =
      request.sender_id === currentUserId ? request.receiver_id : request.sender_id;
    if (otherUserId) {
      connectedMemberIds.add(otherUserId);
    }
  }

  return connectedMemberIds.size;
}

export function validateIntroductionRequestMessage(message: string): string | null {
  const trimmed = message.trim();

  if (!trimmed) {
    return "Please share a short note about why you would like to connect.";
  }

  if (trimmed.length < INTRODUCTION_MESSAGE_MIN_LENGTH) {
    return `Please write at least ${INTRODUCTION_MESSAGE_MIN_LENGTH} characters so the member understands why you would like to connect.`;
  }

  return null;
}

export async function fetchMemberConnectionCount(userId: string): Promise<{
  count: number;
  error: Error | null;
}> {
  if (!userId.trim()) {
    return { count: 0, error: null };
  }

  if (!supabase) {
    return { count: 0, error: new Error("Supabase is not configured.") };
  }

  const { data, error } = await supabase.rpc("count_member_connections", {
    p_user_id: userId,
  });

  if (error) {
    return { count: 0, error };
  }

  return { count: typeof data === "number" ? data : 0, error: null };
}

export async function resolveProfileConnectionCount(
  userId: string,
  introductionRequests: IntroductionRequestRecord[] = [],
): Promise<number> {
  const { count, error } = await fetchMemberConnectionCount(userId);
  if (!error) {
    return count;
  }

  if (introductionRequests.length > 0) {
    return countMemberConnections(userId, introductionRequests);
  }

  return 0;
}

export async function fetchMemberRelationshipContext(): Promise<{
  context: MemberRelationshipContext | null;
  error: Error | null;
}> {
  const [{ userId, error: sessionError }, { data: requests, error: requestsError }, messagesResult] =
    await Promise.all([
      getCurrentAuthUserId(),
      fetchIntroductionRequests(),
      fetchDirectPrivateMessages(),
    ]);

  if (sessionError) {
    return { context: null, error: sessionError };
  }

  if (!userId) {
    return { context: null, error: null };
  }

  if (requestsError) {
    return { context: null, error: requestsError };
  }

  if (messagesResult.error) {
    return { context: null, error: messagesResult.error };
  }

  const directThreadUserIds = new Set(
    extractDirectMessageParticipantUserIds(messagesResult.data ?? [], userId),
  );

  return {
    context: {
      currentUserId: userId,
      introductionRequests: requests ?? [],
      directThreadUserIds,
    },
    error: null,
  };
}
