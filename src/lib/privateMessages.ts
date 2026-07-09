import type { DirectConversationSummary, PrivateMessageRecord } from "../types/privateMessage";
import { getCurrentAuthUserId } from "./authUserLinking";
import { supabase } from "./supabase";

type PrivateMessageInsertPayload = {
  introduction_request_id: string | null;
  sender_id: string;
  receiver_id: string;
  body: string;
};

const PRIVATE_MESSAGE_RLS_ERROR =
  "Message could not be sent because database permissions blocked the insert.";

const DIRECT_MESSAGE_SELECT =
  "id, introduction_request_id, sender_id, receiver_id, body, created_at, read_at";

function formatInsertPayloadForDebug(payload: PrivateMessageInsertPayload) {
  return [
    `introduction_request_id=${payload.introduction_request_id ?? "null"}`,
    `sender_id=${payload.sender_id}`,
    `receiver_id=${payload.receiver_id}`,
    `body=${JSON.stringify(payload.body)}`,
  ].join(", ");
}

function buildPrivateMessageError(error: Error, payload: PrivateMessageInsertPayload) {
  const payloadSummary = formatInsertPayloadForDebug(payload);
  const isRlsError =
    error.message.toLowerCase().includes("row-level security") ||
    error.message.toLowerCase().includes("permission denied") ||
    (error as { code?: string }).code === "42501";

  if (isRlsError) {
    return new Error(`${PRIVATE_MESSAGE_RLS_ERROR} Attempted insert: ${payloadSummary}`);
  }

  return new Error(`${error.message} Attempted insert: ${payloadSummary}`);
}

async function getSessionUserId() {
  const { userId, error } = await getCurrentAuthUserId();
  return { userId, error };
}

function getOtherParticipantId(message: PrivateMessageRecord, currentUserId: string) {
  return message.sender_id === currentUserId ? message.receiver_id : message.sender_id;
}

export function buildDirectConversationSummaries({
  messages,
  currentUserId,
  memberNamesByUserId,
}: {
  messages: PrivateMessageRecord[];
  currentUserId: string;
  memberNamesByUserId: Record<string, string>;
}): DirectConversationSummary[] {
  const summaries = new Map<string, DirectConversationSummary>();

  for (const message of messages) {
    const otherUserId = getOtherParticipantId(message, currentUserId);
    const existing = summaries.get(otherUserId);

    if (!existing) {
      summaries.set(otherUserId, {
        otherUserId,
        otherUserName: memberNamesByUserId[otherUserId] ?? "Member",
        lastMessageBody: message.body,
        lastMessageAt: message.created_at,
        unreadCount:
          message.receiver_id === currentUserId && !message.read_at ? 1 : 0,
      });
      continue;
    }

    existing.lastMessageBody = message.body;
    existing.lastMessageAt = message.created_at;
    if (message.receiver_id === currentUserId && !message.read_at) {
      existing.unreadCount += 1;
    }
  }

  return Array.from(summaries.values()).sort(
    (left, right) =>
      new Date(right.lastMessageAt).getTime() - new Date(left.lastMessageAt).getTime(),
  );
}

async function verifyAcceptedIntroductionRequest(introductionRequestId: string, userId: string) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const { data, error } = await supabase
    .from("introduction_requests")
    .select("id, sender_id, receiver_id, status")
    .eq("id", introductionRequestId)
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  if (!data || data.status !== "accepted") {
    return { data: null, error: new Error("Messaging is only available for accepted introductions.") };
  }

  if (data.sender_id !== userId && data.receiver_id !== userId) {
    return { data: null, error: new Error("You do not have access to this conversation.") };
  }

  return { data, error: null };
}

export async function fetchDirectPrivateMessages() {
  const { userId, error: sessionError } = await getSessionUserId();
  if (sessionError || !userId) {
    return { data: [] as PrivateMessageRecord[], error: sessionError };
  }

  if (!supabase) {
    return { data: [] as PrivateMessageRecord[], error: new Error("Supabase is not configured.") };
  }

  const { data, error } = await supabase
    .from("private_messages")
    .select(DIRECT_MESSAGE_SELECT)
    .is("introduction_request_id", null)
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order("created_at", { ascending: true });

  return { data: (data ?? []) as PrivateMessageRecord[], error };
}

export async function fetchDirectMessageThread(otherUserId: string) {
  const { userId, error: sessionError } = await getSessionUserId();
  if (sessionError || !userId) {
    return { data: [] as PrivateMessageRecord[], error: sessionError };
  }

  if (!supabase) {
    return { data: [] as PrivateMessageRecord[], error: new Error("Supabase is not configured.") };
  }

  const { data, error } = await supabase
    .from("private_messages")
    .select(DIRECT_MESSAGE_SELECT)
    .is("introduction_request_id", null)
    .or(
      `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`,
    )
    .order("created_at", { ascending: true });

  return { data: (data ?? []) as PrivateMessageRecord[], error };
}

export async function sendDirectPrivateMessage({
  receiverUserId,
  body,
}: {
  receiverUserId: string;
  body: string;
}) {
  const trimmedBody = body.trim();
  if (!trimmedBody) {
    return { data: null, error: new Error("Message cannot be empty.") };
  }

  const { userId, error: sessionError } = await getSessionUserId();
  if (sessionError || !userId) {
    return { data: null, error: sessionError };
  }

  if (receiverUserId === userId) {
    return { data: null, error: new Error("You cannot message yourself.") };
  }

  const insertPayload: PrivateMessageInsertPayload = {
    introduction_request_id: null,
    sender_id: userId,
    receiver_id: receiverUserId,
    body: trimmedBody,
  };

  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const { data, error } = await supabase
    .from("private_messages")
    .insert(insertPayload)
    .select("id")
    .maybeSingle();

  if (error) {
    return { data: null, error: buildPrivateMessageError(error, insertPayload) };
  }

  if (!data) {
    return {
      data: null,
      error: new Error(
        `${PRIVATE_MESSAGE_RLS_ERROR} Attempted insert: ${formatInsertPayloadForDebug(insertPayload)}`,
      ),
    };
  }

  return { data, error: null };
}

export async function markDirectMessagesAsRead(otherUserId: string) {
  if (!supabase) {
    return { error: new Error("Supabase is not configured.") };
  }

  const { userId, error: sessionError } = await getSessionUserId();
  if (sessionError || !userId) {
    return { error: sessionError };
  }

  const { error } = await supabase
    .from("private_messages")
    .update({ read_at: new Date().toISOString() })
    .is("introduction_request_id", null)
    .eq("sender_id", otherUserId)
    .eq("receiver_id", userId)
    .is("read_at", null);

  return { error };
}

export async function fetchPrivateMessages(introductionRequestId: string) {
  const { userId, error: sessionError } = await getSessionUserId();
  if (sessionError || !userId) {
    return { data: null, error: sessionError };
  }

  const { error: accessError } = await verifyAcceptedIntroductionRequest(introductionRequestId, userId);
  if (accessError) {
    return { data: null, error: accessError };
  }

  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const { data, error } = await supabase
    .from("private_messages")
    .select(DIRECT_MESSAGE_SELECT)
    .eq("introduction_request_id", introductionRequestId)
    .order("created_at", { ascending: true });

  return { data: data as PrivateMessageRecord[] | null, error };
}

export async function sendPrivateMessage({
  introductionRequestId,
  body,
}: {
  introductionRequestId: string;
  body: string;
}) {
  const trimmedBody = body.trim();
  if (!trimmedBody) {
    return { data: null, error: new Error("Message cannot be empty.") };
  }

  const { userId, error: sessionError } = await getSessionUserId();
  if (sessionError || !userId) {
    return { data: null, error: sessionError };
  }

  const { data: request, error: accessError } = await verifyAcceptedIntroductionRequest(
    introductionRequestId,
    userId,
  );
  if (accessError || !request) {
    return { data: null, error: accessError };
  }

  const receiverId =
    request.sender_id === userId ? request.receiver_id : request.sender_id;

  const participantAuthUserIds = [request.sender_id, request.receiver_id];
  if (!participantAuthUserIds.includes(receiverId) || receiverId === userId) {
    return {
      data: null,
      error: new Error(
        `Invalid receiver auth user id for this introduction. Expected one of [${request.sender_id}, ${request.receiver_id}] but got receiver_id=${receiverId}, sender_id=${userId}.`,
      ),
    };
  }

  const insertPayload: PrivateMessageInsertPayload = {
    introduction_request_id: introductionRequestId,
    sender_id: userId,
    receiver_id: receiverId,
    body: trimmedBody,
  };

  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const { data, error } = await supabase
    .from("private_messages")
    .insert(insertPayload)
    .select("id")
    .maybeSingle();

  if (error) {
    return { data: null, error: buildPrivateMessageError(error, insertPayload) };
  }

  if (!data) {
    return {
      data: null,
      error: new Error(
        `${PRIVATE_MESSAGE_RLS_ERROR} Attempted insert: ${formatInsertPayloadForDebug(insertPayload)}`,
      ),
    };
  }

  return { data, error: null };
}

export async function fetchUnreadMessageCount() {
  if (!supabase) {
    return { count: 0, error: new Error("Supabase is not configured.") };
  }

  const { userId, error: sessionError } = await getSessionUserId();
  if (sessionError || !userId) {
    return { count: 0, error: sessionError };
  }

  const { count, error } = await supabase
    .from("private_messages")
    .select("id", { count: "exact", head: true })
    .eq("receiver_id", userId)
    .is("read_at", null);

  if (error) {
    return { count: 0, error };
  }

  return { count: count ?? 0, error: null };
}

export async function markIntroductionMessagesAsRead(introductionRequestId: string) {
  if (!supabase) {
    return { error: new Error("Supabase is not configured.") };
  }

  const { userId, error: sessionError } = await getSessionUserId();
  if (sessionError || !userId) {
    return { error: sessionError };
  }

  const { error } = await supabase
    .from("private_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("introduction_request_id", introductionRequestId)
    .eq("receiver_id", userId)
    .is("read_at", null);

  return { error };
}
