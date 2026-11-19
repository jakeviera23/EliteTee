import {
  SESSION_CACHE_KEYS,
  getSessionCacheStale,
  setSessionCache,
} from "@/lib/sessionCache";
import type { MobileConversationSummary } from "@/types/messages";

export function readConversationsCache(): MobileConversationSummary[] {
  return getSessionCacheStale<MobileConversationSummary[]>(SESSION_CACHE_KEYS.conversations) ?? [];
}

export function writeConversationsCache(conversations: MobileConversationSummary[]) {
  setSessionCache(SESSION_CACHE_KEYS.conversations, conversations);
}

/** Mark a thread as read in the local inbox cache (does not invent unread). */
export function markConversationReadInCache(otherUserId: string) {
  const cached = readConversationsCache();
  if (cached.length === 0) return;

  writeConversationsCache(
    cached.map((conversation) =>
      conversation.otherUserId === otherUserId
        ? { ...conversation, unreadCount: 0 }
        : conversation,
    ),
  );
}

/**
 * Immediately update inbox preview after a successful send.
 * Moves the thread to the top; does not mark the thread unread for the sender.
 */
export function upsertConversationPreviewInCache(input: {
  otherUserId: string;
  otherUserName: string;
  otherUserPhotoUrl?: string | null;
  otherUserPrimaryClub?: string;
  otherUserBasedIn?: string;
  lastMessageBody: string;
  lastMessageAt: string;
}): MobileConversationSummary[] {
  const cached = readConversationsCache();
  const existing = cached.find((conversation) => conversation.otherUserId === input.otherUserId);

  const updated: MobileConversationSummary = {
    otherUserId: input.otherUserId,
    otherUserName: input.otherUserName || existing?.otherUserName || "Member",
    otherUserPhotoUrl: input.otherUserPhotoUrl ?? existing?.otherUserPhotoUrl ?? null,
    otherUserPrimaryClub: input.otherUserPrimaryClub ?? existing?.otherUserPrimaryClub ?? "",
    otherUserBasedIn: input.otherUserBasedIn ?? existing?.otherUserBasedIn ?? "",
    lastMessageBody: input.lastMessageBody,
    lastMessageAt: input.lastMessageAt,
    // Sender's own message must never create unread for them.
    unreadCount: existing?.unreadCount ?? 0,
  };

  const next = [
    updated,
    ...cached.filter((conversation) => conversation.otherUserId !== input.otherUserId),
  ];
  writeConversationsCache(next);
  return next;
}
