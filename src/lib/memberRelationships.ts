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

export type MemberRelationshipAction =
  | "request_introduction"
  | "pending_sent"
  | "respond_to_request"
  | "message";

export type MemberRelationshipCta = {
  action: MemberRelationshipAction;
  label: string;
  primary: boolean;
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

export function canDirectMessageMember(
  currentUserId: string,
  otherUserId: string,
  _requests: IntroductionRequestRecord[] = [],
  _directThreadUserIds: Set<string> = new Set(),
): boolean {
  if (!currentUserId || !otherUserId || currentUserId === otherUserId) {
    return false;
  }

  // Membership approval + portal access (enforced by RLS) is the trust gate.
  return true;
}

export function resolveMemberRelationshipCtaForPair(
  currentUserId: string,
  otherUserId: string,
  _context: Pick<MemberRelationshipContext, "introductionRequests" | "directThreadUserIds">,
  options?: { compact?: boolean },
): MemberRelationshipCta {
  if (!currentUserId || !otherUserId || currentUserId === otherUserId) {
    return resolveMemberRelationshipCta("none", options);
  }

  return resolveMemberRelationshipCta("connected", options);
}

export function resolveMemberRelationshipCta(
  state: MemberRelationshipState,
  options?: { compact?: boolean },
): MemberRelationshipCta {
  void state;
  void options;
  return {
    action: "message",
    label: "Message",
    primary: true,
  };
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

export function filterMessageableMemberUserIds(
  memberUserIds: string[],
  context: MemberRelationshipContext,
): string[] {
  return memberUserIds.filter((memberUserId) =>
    canDirectMessageMember(
      context.currentUserId,
      memberUserId,
      context.introductionRequests,
      context.directThreadUserIds,
    ),
  );
}

export async function assertCanSendDirectMessage(
  senderId: string,
  receiverId: string,
): Promise<Error | null> {
  if (!senderId) {
    return new Error("You must be signed in to send messages.");
  }

  if (!receiverId || senderId === receiverId) {
    return new Error("You cannot message yourself.");
  }

  // Portal access for both members is enforced by RLS (074).
  return null;
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
