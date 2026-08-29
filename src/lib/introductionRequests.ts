import type { IntroductionRequestType, IntroductionRequestRecord } from "../types/introductionRequest";
import type { MemberProfileRecord } from "../types/memberProfileRecord";
import { getCurrentAuthUserId } from "./authUserLinking";
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
    return { data: null, error: new Error("You cannot request an introduction to yourself.") };
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

  const pairRecords = (existingRequests ?? []) as Pick<
    IntroductionRequestRecord,
    "id" | "sender_id" | "receiver_id" | "status"
  >[];

  if (membersAreConnected(senderId, receiverId, pairRecords as IntroductionRequestRecord[])) {
    return {
      data: null,
      error: new Error("You are already connected with this member. Open Messages to continue the conversation."),
    };
  }

  const { data: existingPending, error: existingError } = await supabase
    .from("introduction_requests")
    .select("id")
    .eq("sender_id", senderId)
    .eq("receiver_id", receiverId)
    .eq("status", "pending")
    .maybeSingle();

  if (existingError) {
    return { data: null, error: existingError };
  }

  if (existingPending) {
    return {
      data: null,
      error: new Error(
        "You already have a pending introduction request with this member. Check Introduction Requests for status.",
      ),
    };
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

  return { data, error };
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

  const { data, error } = await supabase
    .from("introduction_requests")
    .select(
      "id, sender_id, receiver_id, status, request_type, message, created_at, accepted_at, response_message",
    )
    .order("created_at", { ascending: false });

  if (error) {
    return { data: null, error };
  }

  let withNames: IntroductionRequestRecord[];

  try {
    withNames = await attachProfileNames((data ?? []) as IntroductionRequestRow[]);
  } catch (profileError) {
    console.error("[introductionRequests] failed to attach profile names", profileError);
    withNames = ((data ?? []) as IntroductionRequestRow[]).map((request) => ({
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
