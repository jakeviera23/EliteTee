import type { IntroductionRequestType, IntroductionRequestRecord } from "../types/introductionRequest";
import type { MemberProfileRecord } from "../types/memberProfileRecord";
import { getCurrentAuthUserId } from "./authUserLinking";
import { filterOwnIntroductionRequests } from "./introductionBoard";
import {
  membersAreConnected,
  validateIntroductionRequestMessage,
} from "./memberRelationships";
import { supabase } from "./supabase";

type IntroductionRequestRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  request_type: IntroductionRequestType;
  message: string;
  created_at: string;
};

const UNLINKED_MEMBER_ERROR = "This member is not linked to a user account yet.";

const INTRODUCTION_REQUEST_UPDATE_DENIED_ERROR =
  "Unable to accept or decline this request. Only the receiving member can respond to a pending request.";

const INTRODUCTION_REQUEST_CANCEL_DENIED_ERROR =
  "Unable to cancel this request. Only the sender can withdraw a pending request they sent.";

export async function createIntroductionRequest({
  receiverMember,
  requestType,
  message,
}: {
  receiverMember: MemberProfileRecord;
  requestType: IntroductionRequestType;
  message: string;
}) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const { userId: senderId, error: sessionError } = await getCurrentAuthUserId();

  if (sessionError) {
    return { data: null, error: sessionError };
  }

  if (!senderId) {
    return { data: null, error: new Error("You must be signed in to send introduction requests.") };
  }

  const receiverId = receiverMember.user_id;
  if (!receiverId) {
    return { data: null, error: new Error(UNLINKED_MEMBER_ERROR) };
  }

  if (senderId === receiverId) {
    return { data: null, error: new Error(SELF_INTRODUCTION_ERROR) };
  }

  const messageValidationError = validateIntroductionRequestMessage(message);
  if (messageValidationError) {
    return { data: null, error: new Error(messageValidationError) };
  }

  const { data: existingRequests, error: pairError } = await supabase
    .from("introduction_requests")
    .select("id, sender_id, receiver_id, status")
    .or(
      `and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`,
    );

  if (pairError) {
    return { data: null, error: pairError };
  }

  const conflictError = resolveIntroductionRequestConflict(
    senderId,
    receiverId,
    (existingRequests ?? []) as IntroductionPairRecord[],
  );
  if (conflictError) {
    return { data: null, error: new Error(conflictError) };
  }

  const { data, error } = await supabase
    .from("introduction_requests")
    .insert({
      sender_id: senderId,
      receiver_id: receiverId,
      status: "pending",
      request_type: requestType,
      message: message.trim(),
    })
    .select("id")
    .single();

  if (error && (error as { code?: string }).code === "23505") {
    return { data: null, error: new Error(INTRODUCTION_ALREADY_PENDING_ERROR) };
  }

  return { data, error };
}

type IntroductionPairRecord = Pick<
  IntroductionRequestRecord,
  "id" | "sender_id" | "receiver_id" | "status"
>;

export const INTRODUCTION_ALREADY_INTRODUCED_ERROR =
  "You have already been introduced to this member. You can message them anytime.";

export const INTRODUCTION_ALREADY_PENDING_ERROR =
  "You already have a pending introduction request with this member. Track it in Introductions.";

export const INTRODUCTION_AWAITING_YOUR_RESPONSE_ERROR =
  "This member has already requested an introduction to you. Respond to it in Introductions.";

const SELF_INTRODUCTION_ERROR = "You cannot request an introduction to yourself.";

/** Errors produced by this module that are written for members and safe to display verbatim. */
export function isMemberFacingIntroductionError(message: string): boolean {
  const memberFacingMessages = [
    INTRODUCTION_ALREADY_INTRODUCED_ERROR,
    INTRODUCTION_ALREADY_PENDING_ERROR,
    INTRODUCTION_AWAITING_YOUR_RESPONSE_ERROR,
    INTRODUCTION_REQUEST_UPDATE_DENIED_ERROR,
    INTRODUCTION_REQUEST_CANCEL_DENIED_ERROR,
    UNLINKED_MEMBER_ERROR,
    SELF_INTRODUCTION_ERROR,
    validateIntroductionRequestMessage(""),
    validateIntroductionRequestMessage("x"),
  ];
  return memberFacingMessages.includes(message);
}

export function resolveIntroductionRequestConflict(
  senderId: string,
  receiverId: string,
  pairRecords: IntroductionPairRecord[],
): string | null {
  const relevant = pairRecords.filter(
    (record) =>
      (record.sender_id === senderId && record.receiver_id === receiverId) ||
      (record.sender_id === receiverId && record.receiver_id === senderId),
  );

  if (membersAreConnected(senderId, receiverId, relevant as IntroductionRequestRecord[])) {
    return INTRODUCTION_ALREADY_INTRODUCED_ERROR;
  }

  const pending = relevant.filter((record) => record.status.trim().toLowerCase() === "pending");

  if (pending.some((record) => record.sender_id === senderId)) {
    return INTRODUCTION_ALREADY_PENDING_ERROR;
  }

  if (pending.some((record) => record.sender_id === receiverId)) {
    return INTRODUCTION_AWAITING_YOUR_RESPONSE_ERROR;
  }

  return null;
}

async function attachProfileNames(
  requests: IntroductionRequestRow[],
): Promise<IntroductionRequestRecord[]> {
  if (!supabase || requests.length === 0) {
    return requests.map((request) => ({
      ...request,
      sender_name: undefined,
      receiver_name: undefined,
    }));
  }

  const userIds = [
    ...new Set(requests.flatMap((request) => [request.sender_id, request.receiver_id])),
  ];

  const { data: profiles } = await supabase
    .from("member_profiles")
    .select("user_id, full_name")
    .in("user_id", userIds);

  const nameByUserId = new Map(
    (profiles ?? [])
      .filter((profile) => profile.user_id)
      .map((profile) => [profile.user_id as string, profile.full_name as string]),
  );

  return requests.map((request) => ({
    ...request,
    sender_name: nameByUserId.get(request.sender_id),
    receiver_name: nameByUserId.get(request.receiver_id),
  }));
}

export async function fetchIntroductionRequests() {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const { userId, error: sessionError } = await getCurrentAuthUserId();

  if (sessionError) {
    return { data: null, error: sessionError };
  }

  if (!userId) {
    return { data: [] as IntroductionRequestRecord[], error: null };
  }

  const { data, error } = await supabase
    .from("introduction_requests")
    .select(
      "id, sender_id, receiver_id, status, request_type, message, created_at, accepted_at, response_message",
    )
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error) {
    return { data: null, error };
  }

  const ownRows = filterOwnIntroductionRequests((data ?? []) as IntroductionRequestRow[], userId);

  let withNames: IntroductionRequestRecord[];

  try {
    withNames = await attachProfileNames(ownRows);
  } catch (profileError) {
    console.error("[introductionRequests] failed to attach profile names", profileError);
    withNames = ownRows.map((request) => ({
      ...request,
      sender_name: undefined,
      receiver_name: undefined,
    }));
  }

  return { data: withNames, error: null };
}

/** @deprecated Use fetchIntroductionRequests */
export async function fetchPendingIntroductionRequests() {
  return fetchIntroductionRequests();
}

export async function updateIntroductionRequestStatus(
  requestId: string,
  status: "accepted" | "declined",
  responseMessage?: string,
) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const { userId, error: sessionError } = await getCurrentAuthUserId();

  if (sessionError) {
    return { data: null, error: sessionError };
  }

  if (!userId) {
    return { data: null, error: new Error("You must be signed in to respond to requests.") };
  }

  const updatePayload: {
    status: "accepted" | "declined";
    accepted_at?: string;
    response_message?: string;
  } = { status };

  if (status === "accepted") {
    updatePayload.accepted_at = new Date().toISOString();
  }

  const trimmedResponseMessage = responseMessage?.trim();
  if (trimmedResponseMessage) {
    updatePayload.response_message = trimmedResponseMessage;
  }

  const { data, error } = await supabase
    .from("introduction_requests")
    .update(updatePayload)
    .eq("id", requestId)
    .eq("receiver_id", userId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) {
    const isRlsError =
      error.code === "42501" ||
      error.message.toLowerCase().includes("row-level security") ||
      error.message.toLowerCase().includes("permission denied");

    return {
      data: null,
      error: isRlsError ? new Error(INTRODUCTION_REQUEST_UPDATE_DENIED_ERROR) : error,
    };
  }

  if (!data) {
    return { data: null, error: new Error(INTRODUCTION_REQUEST_UPDATE_DENIED_ERROR) };
  }

  return { data, error: null };
}

export async function cancelIntroductionRequest(requestId: string) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const { userId, error: sessionError } = await getCurrentAuthUserId();

  if (sessionError) {
    return { data: null, error: sessionError };
  }

  if (!userId) {
    return { data: null, error: new Error("You must be signed in to cancel requests.") };
  }

  const { data, error } = await supabase
    .from("introduction_requests")
    .update({ status: "declined" })
    .eq("id", requestId)
    .eq("sender_id", userId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) {
    const isRlsError =
      error.code === "42501" ||
      error.message.toLowerCase().includes("row-level security") ||
      error.message.toLowerCase().includes("permission denied");

    return {
      data: null,
      error: isRlsError ? new Error(INTRODUCTION_REQUEST_CANCEL_DENIED_ERROR) : error,
    };
  }

  if (!data) {
    return { data: null, error: new Error(INTRODUCTION_REQUEST_CANCEL_DENIED_ERROR) };
  }

  return { data, error: null };
}

export async function fetchPendingIncomingIntroductionCount() {
  if (!supabase) {
    return { count: 0, error: new Error("Supabase is not configured.") };
  }

  const { userId, error: sessionError } = await getCurrentAuthUserId();

  if (sessionError) {
    return { count: 0, error: sessionError };
  }

  if (!userId) {
    return { count: 0, error: null };
  }

  const { count, error } = await supabase
    .from("introduction_requests")
    .select("id", { count: "exact", head: true })
    .eq("receiver_id", userId)
    .eq("status", "pending");

  return { count: count ?? 0, error };
}
