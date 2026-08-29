import type { DirectConversationSummary, ConversationParticipantIdentity, PrivateMessageRecord } from "../types/privateMessage";
import { getCurrentAuthUserId } from "./authUserLinking";
import { assertCanSendDirectMessage } from "./memberRelationships";
import {
  fetchAttachmentsForMessageIds,
  formatMessagePreviewBody,
  signPrivateMessageAttachments,
  uploadPrivateMessageImages,
  validatePrivateMessageImageFiles,
} from "./privateMessageMedia";
import { supabase } from "./supabase";

type PrivateMessageInsertPayload = {
  introduction_request_id: string | null;
  sender_id: string;
  receiver_id: string;
  body: string;
};

const PRIVATE_MESSAGE_RLS_ERROR =
  "Your message could not be sent. Request and accept an introduction before messaging this member for the first time.";

export const PRIVATE_MESSAGE_MAX_LENGTH = 2000;
export const PRIVATE_MESSAGE_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

const DIRECT_MESSAGE_SELECT =
  "id, introduction_request_id, sender_id, receiver_id, body, created_at, read_at, edited_at";

function validateMessageBody(body: string, { allowEmpty = false }: { allowEmpty?: boolean } = {}) {
  const trimmedBody = body.trim();

  if (!trimmedBody && !allowEmpty) {
    return { trimmedBody: "", error: new Error("Message cannot be empty.") };
  }

  if (trimmedBody.length > PRIVATE_MESSAGE_MAX_LENGTH) {
    return {
      trimmedBody: "",
      error: new Error(`Message cannot exceed ${PRIVATE_MESSAGE_MAX_LENGTH} characters.`),
    };
  }

  return { trimmedBody, error: null };
}

export function isPrivateMessageEditable(message: Pick<PrivateMessageRecord, "created_at">) {
  const createdAt = new Date(message.created_at).getTime();
  if (Number.isNaN(createdAt)) return false;
  return Date.now() - createdAt <= PRIVATE_MESSAGE_EDIT_WINDOW_MS;
}

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

export function extractDirectMessageParticipantUserIds(
  messages: PrivateMessageRecord[],
  currentUserId: string,
) {
  const participantIds = new Set<string>();

  for (const message of messages) {
    const otherUserId = getOtherParticipantId(message, currentUserId).trim();
    if (otherUserId) {
      participantIds.add(otherUserId);
    }
  }

  return [...participantIds];
}

export function buildDirectConversationSummaries({
  messages,
  currentUserId,
  memberNamesByUserId,
  memberIdentitiesByUserId,
}: {
  messages: PrivateMessageRecord[];
  currentUserId: string;
  memberNamesByUserId?: Record<string, string>;
  memberIdentitiesByUserId?: Record<string, ConversationParticipantIdentity>;
}): DirectConversationSummary[] {
  const summaries = new Map<string, DirectConversationSummary>();

  for (const message of messages) {
    const otherUserId = getOtherParticipantId(message, currentUserId);
    const identity = memberIdentitiesByUserId?.[otherUserId];
    const resolvedName =
      identity?.full_name?.trim() ||
      memberNamesByUserId?.[otherUserId]?.trim() ||
      "";
    const otherUserName = resolvedName || "Member";
    const existing = summaries.get(otherUserId);

    if (!existing) {
      summaries.set(otherUserId, {
        otherUserId,
        otherUserName,
        otherUserPhotoUrl: identity?.club_logo_url ?? null,
        otherUserFoundingNumber: identity?.founding_member_number ?? null,
        otherUserPrimaryClub: identity?.primary_club ?? "",
        otherUserBasedIn: identity?.based_in ?? "",
        lastMessageBody: formatMessagePreviewBody(
          message.body,
          message.attachments?.length ?? 0,
        ),
        lastMessageAt: message.created_at,
        lastMessageWasEdited: Boolean(message.edited_at),
        lastMessageAttachmentCount: message.attachments?.length ?? 0,
        unreadCount:
          message.receiver_id === currentUserId && !message.read_at ? 1 : 0,
      });
      continue;
    }

    existing.lastMessageBody = formatMessagePreviewBody(
      message.body,
      message.attachments?.length ?? 0,
    );
    existing.lastMessageAt = message.created_at;
    existing.lastMessageWasEdited = Boolean(message.edited_at);
    existing.lastMessageAttachmentCount = message.attachments?.length ?? 0;
    if (!existing.otherUserName || existing.otherUserName === "Member") {
      existing.otherUserName = otherUserName;
    }
    if (identity?.club_logo_url && !existing.otherUserPhotoUrl) {
      existing.otherUserPhotoUrl = identity.club_logo_url;
    }
    if (identity?.founding_member_number && !existing.otherUserFoundingNumber) {
      existing.otherUserFoundingNumber = identity.founding_member_number;
    }
    if (identity?.primary_club && !existing.otherUserPrimaryClub) {
      existing.otherUserPrimaryClub = identity.primary_club;
    }
    if (identity?.based_in && !existing.otherUserBasedIn) {
      existing.otherUserBasedIn = identity.based_in;
    }
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

async function hydrateMessagesWithAttachments(messages: PrivateMessageRecord[]) {
  if (messages.length === 0) {
    return { data: messages, error: null as Error | null };
  }

  const { data: attachments, error } = await fetchAttachmentsForMessageIds(
    messages.map((message) => message.id),
  );
  if (error) {
    return { data: messages, error };
  }

  const byMessageId = new Map<string, typeof attachments>();
  for (const attachment of attachments) {
    const list = byMessageId.get(attachment.message_id) ?? [];
    list.push(attachment);
    byMessageId.set(attachment.message_id, list);
  }

  const hydrated = await Promise.all(
    messages.map(async (message) => {
      const rows = byMessageId.get(message.id) ?? [];
      const signed = await signPrivateMessageAttachments(rows);
      return {
        ...message,
        attachments: signed,
      };
    }),
  );

  return { data: hydrated, error: null };
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

  if (error) {
    return { data: [] as PrivateMessageRecord[], error };
  }

  return hydrateMessagesWithAttachments((data ?? []) as PrivateMessageRecord[]);
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

  if (error) {
    return { data: [] as PrivateMessageRecord[], error };
  }

  return hydrateMessagesWithAttachments((data ?? []) as PrivateMessageRecord[]);
}

export async function sendDirectPrivateMessage({
  receiverUserId,
  body,
  imageFiles = [],
}: {
  receiverUserId: string;
  body: string;
  imageFiles?: File[];
}) {
  const files = imageFiles.slice(0, 3);
  const imageValidationError = validatePrivateMessageImageFiles(files);
  if (imageValidationError) {
    return { data: null, error: new Error(imageValidationError) };
  }

  const { trimmedBody, error: validationError } = validateMessageBody(body, {
    allowEmpty: files.length > 0,
  });
  if (validationError) {
    return { data: null, error: validationError };
  }

  if (!trimmedBody && files.length === 0) {
    return { data: null, error: new Error("Message cannot be empty.") };
  }

  const { userId, error: sessionError } = await getSessionUserId();
  if (sessionError || !userId) {
    return { data: null, error: sessionError };
  }

  if (receiverUserId === userId) {
    return { data: null, error: new Error("You cannot message yourself.") };
  }

  const permissionError = await assertCanSendDirectMessage(userId, receiverUserId);
  if (permissionError) {
    return { data: null, error: permissionError };
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

  if (!data?.id) {
    return {
      data: null,
      error: new Error(
        `${PRIVATE_MESSAGE_RLS_ERROR} Attempted insert: ${formatInsertPayloadForDebug(insertPayload)}`,
      ),
    };
  }

  const messageId = String(data.id);

  if (files.length > 0) {
    const uploadResult = await uploadPrivateMessageImages({
      messageId,
      files,
    });

    if (uploadResult.error || uploadResult.data.length === 0) {
      if (!trimmedBody) {
        await supabase.from("private_messages").delete().eq("id", messageId).eq("sender_id", userId);
      }
      return {
        data: null,
        error: uploadResult.error ?? new Error("Images could not be attached."),
      };
    }
  }

  return { data: { id: messageId }, error: null };
}

export async function markDirectMessagesAsRead(otherUserId: string) {
  if (!supabase) {
    return { error: new Error("Supabase is not configured.") };
  }

  const { userId, error: sessionError } = await getSessionUserId();
  if (sessionError || !userId) {
    return { error: sessionError };
  }

  const { error } = await supabase.rpc("mark_direct_private_messages_read", {
    p_other_user_id: otherUserId,
  });

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

  if (error) {
    return { data: null, error };
  }

  return hydrateMessagesWithAttachments((data ?? []) as PrivateMessageRecord[]);
}

export async function sendPrivateMessage({
  introductionRequestId,
  body,
}: {
  introductionRequestId: string;
  body: string;
}) {
  const { trimmedBody, error: validationError } = validateMessageBody(body);
  if (validationError) {
    return { data: null, error: validationError };
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

  const { error } = await supabase.rpc("mark_introduction_private_messages_read", {
    p_introduction_request_id: introductionRequestId,
  });

  return { error };
}

export async function editPrivateMessage({
  messageId,
  body,
}: {
  messageId: string;
  body: string;
}) {
  const { trimmedBody, error: validationError } = validateMessageBody(body);
  if (validationError) {
    return { data: null, error: validationError };
  }

  const { userId, error: sessionError } = await getSessionUserId();
  if (sessionError || !userId) {
    return {
      data: null,
      error: sessionError ?? new Error("You must be signed in to edit a message."),
    };
  }

  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const { data, error } = await supabase.rpc("edit_private_message", {
    p_message_id: messageId,
    p_new_body: trimmedBody,
  });

  if (error) {
    return { data: null, error };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return { data: null, error: new Error("Message could not be updated.") };
  }

  return {
    data: {
      id: String((row as { id: string }).id),
      body: String((row as { body: string }).body),
      edited_at: (row as { edited_at: string | null }).edited_at
        ? String((row as { edited_at: string }).edited_at)
        : new Date().toISOString(),
      created_at: String((row as { created_at: string }).created_at),
    },
    error: null,
  };
}

export function mergeEditedPrivateMessage(
  existing: PrivateMessageRecord,
  update: Pick<PrivateMessageRecord, "id" | "body" | "edited_at" | "created_at">,
): PrivateMessageRecord {
  if (existing.id !== update.id) return existing;
  return {
    ...existing,
    body: update.body,
    edited_at: update.edited_at,
    attachments: existing.attachments,
  };
}
