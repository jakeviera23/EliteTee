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
import {
  buildFeedLikeSeenKey,
  getSeenFeedLikeKeys,
  getSeenIntroductionRequestIds,
} from "./portalNotifications";
import { supabase } from "./supabase";
import { filterPersistedFeedPostIds } from "./feedPostEngagement";
import type { DirectConversationSummary } from "../types/privateMessage";
import type { IntroductionRequestRecord } from "../types/introductionRequest";

export type PortalNotificationKind =
  | "unread_message"
  | "introduction_pending"
  | "introduction_accepted"
  | "introduction_declined"
  | "feed_like";

export type FeedPostLikeRow = {
  post_id: string;
  user_id: string;
  created_at: string;
};

const FEED_LIKE_NOTIFICATION_POST_LIMIT = 100;

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
  feedTarget?: {
    postId: string;
  };
  acknowledgeIntroductionRequestId?: string;
  acknowledgeFeedLikeKey?: string;
};

const TYPE_LABELS: Record<PortalNotificationKind, string> = {
  unread_message: "Message",
  introduction_pending: "Introduction request",
  introduction_accepted: "Introduction accepted",
  introduction_declined: "Introduction declined",
  feed_like: "Like",
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

export function buildFeedLikeNotifications({
  likes,
  likerProfilesByUserId,
  seenFeedLikeKeys,
}: {
  likes: FeedPostLikeRow[];
  likerProfilesByUserId: Record<string, { full_name: string }>;
  seenFeedLikeKeys: Set<string>;
}): PortalNotificationItem[] {
  return likes.map((like) => {
    const memberName = likerProfilesByUserId[like.user_id]?.full_name?.trim() || "Member";
    const seenKey = buildFeedLikeSeenKey(like.post_id, like.user_id);

    return {
      id: `like:${seenKey}`,
      kind: "feed_like",
      typeLabel: TYPE_LABELS.feed_like,
      memberName,
      description: `${memberName} liked your post.`,
      timestampLabel: formatNotificationTimestamp(like.created_at),
      sortTimestamp: new Date(like.created_at).getTime() || 0,
      countsTowardBadge: !seenFeedLikeKeys.has(seenKey),
      feedTarget: { postId: like.post_id },
      acknowledgeFeedLikeKey: seenKey,
    };
  });
}

export function buildPortalNotifications({
  conversations,
  introductionRequests,
  currentUserId,
  seenIntroductionRequestIds,
  feedLikes = [],
  seenFeedLikeKeys = new Set<string>(),
  likerProfilesByUserId = {},
}: {
  conversations: DirectConversationSummary[];
  introductionRequests: IntroductionRequestRecord[];
  currentUserId: string | null;
  seenIntroductionRequestIds: Set<string>;
  feedLikes?: FeedPostLikeRow[];
  seenFeedLikeKeys?: Set<string>;
  likerProfilesByUserId?: Record<string, { full_name: string }>;
}): PortalNotificationItem[] {
  if (!currentUserId) return [];

  const messageItems = buildUnreadMessageNotifications(conversations);
  const introductionItems = buildIntroductionNotifications({
    requests: introductionRequests,
    currentUserId,
    seenIntroductionRequestIds,
  });
  const feedLikeItems = buildFeedLikeNotifications({
    likes: feedLikes,
    likerProfilesByUserId,
    seenFeedLikeKeys,
  });

  return sortNotifications([...messageItems, ...feedLikeItems, ...introductionItems]);
}

export function resolvePortalNotificationDestination(notification: PortalNotificationItem) {
  if (notification.messageTarget) {
    return {
      view: "messages" as const,
      messageTarget: notification.messageTarget,
    };
  }

  if (notification.introductionTarget) {
    return {
      view: "introductions" as const,
      introductionTarget: notification.introductionTarget,
    };
  }

  if (notification.feedTarget) {
    return {
      view: "feed" as const,
      postId: notification.feedTarget.postId,
    };
  }

  return null;
}

export function countUnseenFeedLikeNotifications({
  feedLikes,
  seenFeedLikeKeys,
}: {
  feedLikes: FeedPostLikeRow[];
  seenFeedLikeKeys: Set<string>;
}) {
  return feedLikes.filter(
    (like) => !seenFeedLikeKeys.has(buildFeedLikeSeenKey(like.post_id, like.user_id)),
  ).length;
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
  feedLikes = [],
  seenFeedLikeKeys = new Set<string>(),
}: {
  unreadMessageCount: number;
  introductionRequests: IntroductionRequestRecord[];
  currentUserId: string | null;
  seenIntroductionRequestIds: Set<string>;
  conversations?: DirectConversationSummary[];
  feedLikes?: FeedPostLikeRow[];
  seenFeedLikeKeys?: Set<string>;
}): number {
  if (conversations && conversations.length > 0) {
    return computePortalNotificationBadgeCount(
      buildPortalNotifications({
        conversations,
        introductionRequests,
        currentUserId,
        seenIntroductionRequestIds,
        feedLikes,
        seenFeedLikeKeys,
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

  count += countUnseenFeedLikeNotifications({ feedLikes, seenFeedLikeKeys });

  return count;
}

export const PORTAL_NOTIFICATIONS_EMPTY_MESSAGE = "You're all caught up.";

export type PortalNotificationSection = {
  id: "messages" | "feed" | "introductions";
  label: string;
  showHeader: boolean;
  items: PortalNotificationItem[];
};

export function groupPortalNotifications(
  items: PortalNotificationItem[],
): PortalNotificationSection[] {
  const messages = items.filter((item) => item.kind === "unread_message");
  const feed = items.filter((item) => item.kind === "feed_like");
  const introductions = items.filter(
    (item) => item.kind !== "unread_message" && item.kind !== "feed_like",
  );

  const sections: PortalNotificationSection[] = [];

  if (messages.length > 0) {
    sections.push({
      id: "messages",
      label: "Messages",
      showHeader: false,
      items: messages,
    });
  }

  if (feed.length > 0) {
    sections.push({
      id: "feed",
      label: "Feed",
      showHeader: false,
      items: feed,
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
  feedLikes: FeedPostLikeRow[];
  error: null;
} | {
  notifications: PortalNotificationItem[];
  introductionRequests: IntroductionRequestRecord[];
  conversations: DirectConversationSummary[];
  feedLikes: FeedPostLikeRow[];
  error: string;
};

export function excludeSelfFeedLikes(likes: FeedPostLikeRow[], currentUserId: string) {
  const normalizedUserId = currentUserId.trim();
  return likes.filter((like) => like.user_id.trim() !== normalizedUserId);
}

export async function fetchFeedLikesOnOwnPosts(currentUserId: string) {
  if (!supabase) {
    return { data: [] as FeedPostLikeRow[], error: new Error("Supabase is not configured.") };
  }

  const { data: ownPosts, error: postsError } = await supabase
    .from("member_feed_posts")
    .select("id")
    .eq("user_id", currentUserId)
    .order("created_at", { ascending: false })
    .limit(FEED_LIKE_NOTIFICATION_POST_LIMIT);

  if (postsError) {
    return { data: [] as FeedPostLikeRow[], error: postsError };
  }

  const postIds = filterPersistedFeedPostIds((ownPosts ?? []).map((row) => String(row.id ?? "")));
  if (postIds.length === 0) {
    return { data: [] as FeedPostLikeRow[], error: null };
  }

  const { data: likes, error: likesError } = await supabase
    .from("feed_post_likes")
    .select("post_id, user_id, created_at")
    .in("post_id", postIds)
    .neq("user_id", currentUserId)
    .order("created_at", { ascending: false });

  if (likesError) {
    return { data: [] as FeedPostLikeRow[], error: likesError };
  }

  return {
    data: excludeSelfFeedLikes(
      (likes ?? []).map((row) => ({
        post_id: String(row.post_id ?? ""),
        user_id: String(row.user_id ?? ""),
        created_at: String(row.created_at ?? ""),
      })),
      currentUserId,
    ),
    error: null,
  };
}

export async function fetchPortalNotificationFeed(): Promise<PortalNotificationFeedResult> {
  const { userId, error: sessionError } = await getCurrentAuthUserId();

  if (sessionError) {
    return {
      notifications: [],
      introductionRequests: [],
      conversations: [],
      feedLikes: [],
      error: PORTAL_NOTIFICATIONS_LOAD_ERROR,
    };
  }

  if (!userId) {
    return {
      notifications: [],
      introductionRequests: [],
      conversations: [],
      feedLikes: [],
      error: null,
    };
  }

  const [messagesResult, introductionResult, feedLikesResult] = await Promise.all([
    fetchDirectPrivateMessages(),
    fetchIntroductionRequests(),
    fetchFeedLikesOnOwnPosts(userId),
  ]);

  if (messagesResult.error || introductionResult.error || feedLikesResult.error) {
    if (import.meta.env.DEV) {
      console.error("[PortalNotifications] feed load failed", {
        messagesError: messagesResult.error,
        introductionError: introductionResult.error,
        feedLikesError: feedLikesResult.error,
      });
    }

    return {
      notifications: [],
      introductionRequests: introductionResult.data ?? [],
      conversations: [],
      feedLikes: [],
      error: PORTAL_NOTIFICATIONS_LOAD_ERROR,
    };
  }

  const messages = messagesResult.data ?? [];
  const introductionRequests = introductionResult.data ?? [];
  const feedLikes = feedLikesResult.data ?? [];
  const participantIds = extractDirectMessageParticipantUserIds(messages, userId);
  const likerUserIds = [...new Set(feedLikes.map((like) => like.user_id))];
  const { data: profiles } = await fetchApprovedMemberProfilesByUserIds([
    ...participantIds,
    ...likerUserIds,
  ]);
  const memberIdentitiesByUserId = buildApprovedMemberIdentityMap(profiles ?? []);
  const conversations = buildDirectConversationSummaries({
    messages,
    currentUserId: userId,
    memberIdentitiesByUserId,
  });
  const seenIntroductionRequestIds = getSeenIntroductionRequestIds(userId);
  const seenFeedLikeKeys = getSeenFeedLikeKeys(userId);
  const likerProfilesByUserId = Object.fromEntries(
    likerUserIds.map((likerUserId) => [
      likerUserId,
      { full_name: memberIdentitiesByUserId[likerUserId]?.full_name ?? "Member" },
    ]),
  );
  const notifications = buildPortalNotifications({
    conversations,
    introductionRequests,
    currentUserId: userId,
    seenIntroductionRequestIds,
    feedLikes,
    seenFeedLikeKeys,
    likerProfilesByUserId,
  });

  return {
    notifications,
    introductionRequests,
    conversations,
    feedLikes,
    error: null,
  };
}
