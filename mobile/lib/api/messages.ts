import { getCurrentUserId } from "./members";
import { resolveMemberMediaUrlMap } from "./memberProfileMedia";
import { getMemberDisplayName } from "../memberInitials";
import { requireSupabase } from "../supabase";
import type { MobileConversationSummary, MobilePrivateMessage } from "@/types/messages";

const DIRECT_MESSAGE_SELECT =
  "id, introduction_request_id, sender_id, receiver_id, body, created_at, read_at, edited_at";

type ParticipantIdentity = {
  full_name: string;
  club_logo_url: string | null;
  founding_member_number: string | null;
  primary_club: string;
  based_in: string;
};

function buildConversationSummaries({
  messages,
  currentUserId,
  identitiesByUserId,
}: {
  messages: MobilePrivateMessage[];
  currentUserId: string;
  identitiesByUserId: Record<string, ParticipantIdentity>;
}): MobileConversationSummary[] {
  const summaries = new Map<string, MobileConversationSummary>();

  for (const message of messages) {
    const otherUserId =
      message.sender_id === currentUserId ? message.receiver_id : message.sender_id;
    const identity = identitiesByUserId[otherUserId];
    const otherUserName = getMemberDisplayName(identity?.full_name) || "Member";
    const existing = summaries.get(otherUserId);

    if (!existing) {
      summaries.set(otherUserId, {
        otherUserId,
        otherUserName,
        otherUserPhotoUrl: identity?.club_logo_url ?? null,
        otherUserPrimaryClub: identity?.primary_club ?? "",
        otherUserBasedIn: identity?.based_in ?? "",
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

  return [...summaries.values()].sort(
    (left, right) =>
      new Date(right.lastMessageAt).getTime() - new Date(left.lastMessageAt).getTime(),
  );
}

export async function fetchConversations(): Promise<{
  data: MobileConversationSummary[];
  error: Error | null;
}> {
  const { userId, error: sessionError } = await getCurrentUserId();
  if (sessionError || !userId) {
    return { data: [], error: sessionError ?? new Error("You must be signed in.") };
  }

  const client = requireSupabase();
  const { data: messages, error } = await client
    .from("private_messages")
    .select(DIRECT_MESSAGE_SELECT)
    .is("introduction_request_id", null)
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order("created_at", { ascending: true });

  if (error) {
    return { data: [], error };
  }

  const records = (messages ?? []) as MobilePrivateMessage[];
  const participantIds = [
    ...new Set(
      records
        .map((message) => (message.sender_id === userId ? message.receiver_id : message.sender_id))
        .filter(Boolean),
    ),
  ];

  let identitiesByUserId: Record<string, ParticipantIdentity> = {};

  if (participantIds.length > 0) {
    const { data: profiles } = await client
      .from("member_profiles")
      .select("user_id, full_name, club_logo_url, founding_member_number, primary_club, based_in")
      .in("user_id", participantIds)
      .eq("portal_access_enabled", true);

    const rawIdentities = (profiles ?? [])
      .filter((profile) => profile.user_id)
      .map((profile) => ({
        userId: String(profile.user_id),
        full_name: getMemberDisplayName(String(profile.full_name ?? "")) || "Member",
        club_logo_url: profile.club_logo_url ? String(profile.club_logo_url) : null,
        founding_member_number: profile.founding_member_number
          ? String(profile.founding_member_number)
          : null,
        primary_club: String(profile.primary_club ?? ""),
        based_in: String(profile.based_in ?? ""),
      }));

    const signedByPath = await resolveMemberMediaUrlMap(
      rawIdentities.map((identity) => identity.club_logo_url),
    );

    identitiesByUserId = Object.fromEntries(
      rawIdentities.map((identity) => [
        identity.userId,
        {
          full_name: identity.full_name,
          club_logo_url: identity.club_logo_url
            ? (signedByPath.get(identity.club_logo_url) ?? identity.club_logo_url)
            : null,
          founding_member_number: identity.founding_member_number,
          primary_club: identity.primary_club,
          based_in: identity.based_in,
        },
      ]),
    );
  }

  return {
    data: buildConversationSummaries({
      messages: records,
      currentUserId: userId,
      identitiesByUserId,
    }),
    error: null,
  };
}

export async function fetchConversationThread(otherUserId: string): Promise<{
  data: MobilePrivateMessage[];
  error: Error | null;
}> {
  const { userId, error: sessionError } = await getCurrentUserId();
  if (sessionError || !userId) {
    return { data: [], error: sessionError ?? new Error("You must be signed in.") };
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("private_messages")
    .select(DIRECT_MESSAGE_SELECT)
    .is("introduction_request_id", null)
    .or(
      `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`,
    )
    .order("created_at", { ascending: true });

  return { data: (data ?? []) as MobilePrivateMessage[], error };
}

export const PRIVATE_MESSAGE_MAX_LENGTH = 2000;

function validateMessageBody(body: string) {
  const trimmedBody = body.trim();

  if (!trimmedBody) {
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

export async function sendDirectPrivateMessage({
  receiverUserId,
  body,
}: {
  receiverUserId: string;
  body: string;
}): Promise<{ data: { id: string } | null; error: Error | null }> {
  const { trimmedBody, error: validationError } = validateMessageBody(body);
  if (validationError) {
    return { data: null, error: validationError };
  }

  const { userId, error: sessionError } = await getCurrentUserId();
  if (sessionError || !userId) {
    return { data: null, error: sessionError ?? new Error("You must be signed in.") };
  }

  if (receiverUserId === userId) {
    return { data: null, error: new Error("You cannot message yourself.") };
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("private_messages")
    .insert({
      introduction_request_id: null,
      sender_id: userId,
      receiver_id: receiverUserId,
      body: trimmedBody,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  if (!data?.id) {
    return { data: null, error: new Error("Message could not be sent.") };
  }

  return { data: { id: String(data.id) }, error: null };
}

export async function markDirectMessagesAsRead(otherUserId: string): Promise<{ error: Error | null }> {
  const { userId, error: sessionError } = await getCurrentUserId();
  if (sessionError || !userId) {
    return { error: sessionError ?? new Error("You must be signed in.") };
  }

  const client = requireSupabase();
  const { error } = await client
    .from("private_messages")
    .update({ read_at: new Date().toISOString() })
    .is("introduction_request_id", null)
    .eq("sender_id", otherUserId)
    .eq("receiver_id", userId)
    .is("read_at", null);

  return { error };
}
