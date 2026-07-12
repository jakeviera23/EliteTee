import type { IntroductionTab } from "./introductionBoard";
import { getIntroductionCounterpart } from "./introductionBoard";
import { getCurrentAuthUserId } from "./authUserLinking";
import { fetchIntroductionRequests } from "./introductionRequests";
import {
  buildDirectConversationSummaries,
  extractDirectMessageParticipantUserIds,
  fetchDirectPrivateMessages,
} from "./privateMessages";
import {
  buildApprovedMemberIdentityMap,
  fetchApprovedMemberProfilesByUserIds,
} from "./memberProfiles";
import { getSeenIntroductionRequestIds } from "./portalNotifications";
import type { DirectConversationSummary } from "../types/privateMessage";
import type { IntroductionRequestRecord } from "../types/introductionRequest";

export type PortalNotificationKind =
  | "unread_message"
  | "introduction_pending"
  | "introduction_accepted"
  | "introduction_declined";

export type PortalNotificationItem = {
  id: string;
  kind: PortalNotificationKind;
  typeLabel: string;
  memberName: string;
  description: string;
  timestampLabel: string | null;
  sortTimestamp: number;
  countsTowardBadge: boolean;
  messageTarget?: {
    otherUserId: string;
    otherUserName: string;
  };
  introductionTarget?: {
    tab: IntroductionTab;
    requestId: string;
  };
  acknowledgeIntroductionRequestId?: string;
};

const TYPE_LABELS: Record<PortalNotificationKind, string> = {
  unread_message: "Message",
  introduction_pending: "Introduction request",
  introduction_accepted: "Introduction accepted",
  introduction_declined: "Introduction declined",
};

export function formatNotificationTimestamp(isoTimestamp: string | null | undefined): string | null {
  if (!isoTimestamp) return null;

  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return null;

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function sortNotifications(items: PortalNotificationItem[]) {
  return [...items].sort((left, right) => right.sortTimestamp - left.sortTimestamp);
}

function buildUnreadMessageNotifications(
  conversations: DirectConversationSummary[],
): PortalNotificationItem[] {
  return conversations
    .filter((conversation) => conversation.unreadCount > 0)
    .map((conversation) => ({
      id: `message:${conversation.otherUserId}`,
      kind: "unread_message" as const,
      typeLabel: TYPE_LABELS.unread_message,
      memberName: conversation.otherUserName,
      description:
        conversation.unreadCount === 1
          ? "You have an unread message."
          : `You have ${conversation.unreadCount} unread messages.`,
      timestampLabel: formatNotificationTimestamp(conversation.lastMessageAt),
      sortTimestamp: new Date(conversation.lastMessageAt).getTime() || 0,
      countsTowardBadge: true,
      messageTarget: {
        otherUserId: conversation.otherUserId,
        otherUserName: conversation.otherUserName,
      },
    }));
}

function buildIntroductionNotifications({
  requests,
  currentUserId,
  seenIntroductionRequestIds,
}: {
  requests: IntroductionRequestRecord[];
  currentUserId: string;
  seenIntroductionRequestIds: Set<string>;
}): PortalNotificationItem[] {
  const items: PortalNotificationItem[] = [];

  for (const request of requests) {
    const status = request.status.toLowerCase();
    const counterpart = getIntroductionCounterpart(request, currentUserId);

    if (status === "pending" && request.receiver_id === currentUserId) {
      items.push({
        id: `introduction:pending:${request.id}`,
        kind: "introduction_pending",
        typeLabel: TYPE_LABELS.introduction_pending,
        memberName: counterpart.name,
        description: `${counterpart.name} requested an introduction.`,
        timestampLabel: formatNotificationTimestamp(request.created_at),
        sortTimestamp: new Date(request.created_at).getTime() || 0,
        countsTowardBadge: true,
        introductionTarget: { tab: "incoming", requestId: request.id },
      });
      continue;
    }

    if (status === "accepted") {
      const isSeen = seenIntroductionRequestIds.has(request.id);
      items.push({
        id: `introduction:accepted:${request.id}`,
        kind: "introduction_accepted",
        typeLabel: TYPE_LABELS.introduction_accepted,
        memberName: counterpart.name,
        description:
          request.receiver_id === currentUserId
            ? `You accepted an introduction with ${counterpart.name}.`
            : `${counterpart.name} accepted your introduction request.`,
        timestampLabel: formatNotificationTimestamp(request.accepted_at ?? request.created_at),
        sortTimestamp: new Date(request.accepted_at ?? request.created_at).getTime() || 0,
        countsTowardBadge: !isSeen,
        introductionTarget: { tab: "accepted", requestId: request.id },
        acknowledgeIntroductionRequestId: request.id,
      });
      continue;
    }

    if (status === "declined" && request.sender_id === currentUserId) {
      const isSeen = seenIntroductionRequestIds.has(request.id);
      items.push({
        id: `introduction:declined:${request.id}`,
        kind: "introduction_declined",
        typeLabel: TYPE_LABELS.introduction_declined,
        memberName: counterpart.name,
        description: `${counterpart.name} declined your introduction request.`,
        timestampLabel: formatNotificationTimestamp(request.created_at),
        sortTimestamp: new Date(request.created_at).getTime() || 0,
        countsTowardBadge: !isSeen,
        introductionTarget: { tab: "declined", requestId: request.id },
        acknowledgeIntroductionRequestId: request.id,
      });
    }
  }

  return items;
}

export function buildPortalNotifications({
  conversations,
  introductionRequests,
  currentUserId,
  seenIntroductionRequestIds,
}: {
  conversations: DirectConversationSummary[];
  introductionRequests: IntroductionRequestRecord[];
  currentUserId: string | null;
  seenIntroductionRequestIds: Set<string>;
}): PortalNotificationItem[] {
  if (!currentUserId) return [];

  const messageItems = buildUnreadMessageNotifications(conversations);
  const introductionItems = buildIntroductionNotifications({
    requests: introductionRequests,
    currentUserId,
    seenIntroductionRequestIds,
  });

  return sortNotifications([...messageItems, ...introductionItems]);
}

export function computePortalNotificationBadgeCount(items: PortalNotificationItem[]): number {
  return items.reduce((total, item) => {
    if (!item.countsTowardBadge) return total;
    if (item.kind === "unread_message" && item.messageTarget) {
      const unreadMatch = item.description.match(/(\d+) unread messages?/);
      if (unreadMatch) {
        return total + Number(unreadMatch[1]);
      }
      return total + 1;
    }
    return total + 1;
  }, 0);
}

export function computePortalNotificationBadgeCountFromSources({
  unreadMessageCount,
  introductionRequests,
  currentUserId,
  seenIntroductionRequestIds,
  conversations,
}: {
  unreadMessageCount: number;
  introductionRequests: IntroductionRequestRecord[];
  currentUserId: string | null;
  seenIntroductionRequestIds: Set<string>;
  conversations?: DirectConversationSummary[];
}): number {
  if (conversations && conversations.length > 0) {
    return computePortalNotificationBadgeCount(
      buildPortalNotifications({
        conversations,
        introductionRequests,
        currentUserId,
        seenIntroductionRequestIds,
      }),
    );
  }

  if (!currentUserId) return unreadMessageCount;

  let count = unreadMessageCount;

  for (const request of introductionRequests) {
    const status = request.status.toLowerCase();

    if (status === "pending" && request.receiver_id === currentUserId) {
      count += 1;
      continue;
    }

    if (status === "accepted" && !seenIntroductionRequestIds.has(request.id)) {
      count += 1;
      continue;
    }

    if (
      status === "declined" &&
      request.sender_id === currentUserId &&
      !seenIntroductionRequestIds.has(request.id)
    ) {
      count += 1;
    }
  }

  return count;
}

export const PORTAL_NOTIFICATIONS_EMPTY_MESSAGE = "You're all caught up.";

export type PortalNotificationSection = {
  id: "messages" | "introductions";
  label: string;
  showHeader: boolean;
  items: PortalNotificationItem[];
};

export function groupPortalNotifications(
  items: PortalNotificationItem[],
): PortalNotificationSection[] {
  const messages = items.filter((item) => item.kind === "unread_message");
  const introductions = items.filter((item) => item.kind !== "unread_message");

  const sections: PortalNotificationSection[] = [];

  if (messages.length > 0) {
    sections.push({
      id: "messages",
      label: "Messages",
      showHeader: false,
      items: messages,
    });
  }

  if (introductions.length > 0) {
    sections.push({
      id: "introductions",
      label: "Introductions",
      showHeader: false,
      items: introductions,
    });
  }

  const showHeaders = sections.length > 1;
  return sections.map((section) => ({ ...section, showHeader: showHeaders }));
}

export const PORTAL_NOTIFICATIONS_LOAD_ERROR =
  "Notifications could not be loaded right now. Please try again.";

export type PortalNotificationFeedResult = {
  notifications: PortalNotificationItem[];
  introductionRequests: IntroductionRequestRecord[];
  conversations: DirectConversationSummary[];
  error: null;
} | {
  notifications: PortalNotificationItem[];
  introductionRequests: IntroductionRequestRecord[];
  conversations: DirectConversationSummary[];
  error: string;
};

export async function fetchPortalNotificationFeed(): Promise<PortalNotificationFeedResult> {
  const { userId, error: sessionError } = await getCurrentAuthUserId();

  if (sessionError) {
    return {
      notifications: [],
      introductionRequests: [],
      conversations: [],
      error: PORTAL_NOTIFICATIONS_LOAD_ERROR,
    };
  }

  if (!userId) {
    return {
      notifications: [],
      introductionRequests: [],
      conversations: [],
      error: null,
    };
  }

  const [messagesResult, introductionResult] = await Promise.all([
    fetchDirectPrivateMessages(),
    fetchIntroductionRequests(),
  ]);

  if (messagesResult.error || introductionResult.error) {
    if (import.meta.env.DEV) {
      console.error("[PortalNotifications] feed load failed", {
        messagesError: messagesResult.error,
        introductionError: introductionResult.error,
      });
    }

    return {
      notifications: [],
      introductionRequests: introductionResult.data ?? [],
      conversations: [],
      error: PORTAL_NOTIFICATIONS_LOAD_ERROR,
    };
  }

  const messages = messagesResult.data ?? [];
  const introductionRequests = introductionResult.data ?? [];
  const participantIds = extractDirectMessageParticipantUserIds(messages, userId);
  const { data: profiles } = await fetchApprovedMemberProfilesByUserIds(participantIds);
  const conversations = buildDirectConversationSummaries({
    messages,
    currentUserId: userId,
    memberIdentitiesByUserId: buildApprovedMemberIdentityMap(profiles ?? []),
  });
  const seenIntroductionRequestIds = getSeenIntroductionRequestIds(userId);
  const notifications = buildPortalNotifications({
    conversations,
    introductionRequests,
    currentUserId: userId,
    seenIntroductionRequestIds,
  });

  return {
    notifications,
    introductionRequests,
    conversations,
    error: null,
  };
}
