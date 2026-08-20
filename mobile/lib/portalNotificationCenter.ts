import type { IntroductionTab } from "@/types/introduction";
import {
  getIntroductionCounterpartName,
  getIntroductionCounterpartUserId,
} from "@/lib/introductionBoard";
import { fetchConversations } from "@/lib/api/messages";
import { fetchIntroductionRequests } from "@/lib/api/introductions";
import { getCurrentUserId } from "@/lib/api/members";
import { requireSupabase } from "@/lib/supabase";
import {
  getLastSeenNetworkActivityAt,
  getSeenIntroductionRequestIds,
} from "./portalNotificationsStorage";
import type { MobileConversationSummary } from "@/types/messages";
import type { MobileIntroductionRequest } from "@/types/introduction";

export type PortalNotificationKind =
  | "unread_message"
  | "introduction_pending"
  | "introduction_accepted"
  | "introduction_declined"
  | "comment"
  | "like"
  | "game_request"
  | "travel_match"
  | "course_activity";

export type PortalNotificationItem = {
  id: string;
  kind: PortalNotificationKind;
  typeLabel: string;
  memberName: string;
  description: string;
  timestampLabel: string | null;
  sortTimestamp: number;
  countsTowardBadge: boolean;
  avatarImageUrl?: string | null;
  actorUserId?: string;
  messageTarget?: { otherUserId: string; otherUserName: string };
  introductionTarget?: { tab: IntroductionTab; requestId: string };
  feedTarget?: { postId: string };
  courseTarget?: { slug: string };
  memberTarget?: { userId: string; memberName: string };
  acknowledgeIntroductionRequestId?: string;
};

const TYPE_LABELS: Record<
  Exclude<PortalNotificationKind, "comment" | "like" | "game_request" | "travel_match" | "course_activity">,
  string
> = {
  unread_message: "Message",
  introduction_pending: "Introduction request",
  introduction_accepted: "Introduction accepted",
  introduction_declined: "Introduction declined",
};

export function formatNotificationTimestamp(isoTimestamp: string | null | undefined): string | null {
  if (!isoTimestamp) return null;
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return null;

  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function buildUnreadMessageNotifications(
  conversations: MobileConversationSummary[],
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
          ? "Sent you a message."
          : `Sent you ${conversation.unreadCount} messages.`,
      timestampLabel: formatNotificationTimestamp(conversation.lastMessageAt),
      sortTimestamp: new Date(conversation.lastMessageAt).getTime() || 0,
      countsTowardBadge: true,
      avatarImageUrl: conversation.otherUserPhotoUrl,
      actorUserId: conversation.otherUserId,
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
  requests: MobileIntroductionRequest[];
  currentUserId: string;
  seenIntroductionRequestIds: Set<string>;
}): PortalNotificationItem[] {
  const items: PortalNotificationItem[] = [];

  for (const request of requests) {
    const status = request.status.toLowerCase();
    const counterpartName = getIntroductionCounterpartName(request, currentUserId);
    const counterpartUserId = getIntroductionCounterpartUserId(request, currentUserId);

    if (status === "pending" && request.receiver_id === currentUserId) {
      items.push({
        id: `introduction:pending:${request.id}`,
        kind: "introduction_pending",
        typeLabel: TYPE_LABELS.introduction_pending,
        memberName: counterpartName,
        description: "Requested an introduction with you.",
        timestampLabel: formatNotificationTimestamp(request.created_at),
        sortTimestamp: new Date(request.created_at).getTime() || 0,
        countsTowardBadge: true,
        actorUserId: counterpartUserId,
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
        memberName: counterpartName,
        description:
          request.receiver_id === currentUserId
            ? "You accepted this introduction."
            : "Accepted your introduction request.",
        timestampLabel: formatNotificationTimestamp(request.accepted_at ?? request.created_at),
        sortTimestamp: new Date(request.accepted_at ?? request.created_at).getTime() || 0,
        countsTowardBadge: !isSeen,
        actorUserId: counterpartUserId,
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
        memberName: counterpartName,
        description: "Declined your introduction request.",
        timestampLabel: formatNotificationTimestamp(request.created_at),
        sortTimestamp: new Date(request.created_at).getTime() || 0,
        countsTowardBadge: !isSeen,
        actorUserId: counterpartUserId,
        introductionTarget: { tab: "declined", requestId: request.id },
        acknowledgeIntroductionRequestId: request.id,
      });
    }
  }

  return items;
}

async function fetchNetworkNotifications(userId: string, lastSeenAt: string | null) {
  const client = requireSupabase();
  const items: PortalNotificationItem[] = [];

  const isUnseen = (createdAt: string) => {
    if (!Number.isFinite(Date.parse(createdAt))) return false;
    if (!lastSeenAt || !Number.isFinite(Date.parse(lastSeenAt))) return true;
    return Date.parse(createdAt) > Date.parse(lastSeenAt);
  };

  const [{ data: ownPosts }, { data: likes }, { data: comments }, { data: opportunities }] =
    await Promise.all([
      client
        .from("member_feed_posts")
        .select("id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30),
      client
        .from("member_feed_posts")
        .select("id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30)
        .then(async ({ data: posts }) => {
          const postIds = (posts ?? []).map((post) => String(post.id));
          if (postIds.length === 0) return { data: [] };
          return client
            .from("feed_post_likes")
            .select("id, post_id, user_id, created_at")
            .in("post_id", postIds)
            .neq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(20);
        }),
      client
        .from("member_feed_posts")
        .select("id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30)
        .then(async ({ data: posts }) => {
          const postIds = (posts ?? []).map((post) => String(post.id));
          if (postIds.length === 0) return { data: [] };
          return client
            .from("feed_post_comments")
            .select("id, post_id, user_id, created_at")
            .in("post_id", postIds)
            .neq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(20);
        }),
      client
        .from("member_feed_posts")
        .select("id, user_id, post_type, content, created_at")
        .in("post_type", ["traveling", "looking-for-game"])
        .neq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  const actorIds = [
    ...new Set(
      [...(likes ?? []), ...(comments ?? [])].map((row) => String(row.user_id)).filter(Boolean),
    ),
  ];

  const { data: profiles } =
    actorIds.length > 0
      ? await client.from("member_profiles").select("user_id, full_name").in("user_id", actorIds)
      : { data: [] };

  const nameByUserId = new Map(
    (profiles ?? []).map((profile) => [String(profile.user_id), String(profile.full_name ?? "Member")]),
  );

  for (const comment of comments ?? []) {
    const createdAt = String(comment.created_at ?? "");
    const actorName = nameByUserId.get(String(comment.user_id)) ?? "A member";
    items.push({
      id: `comment:${comment.id}`,
      kind: "comment",
      typeLabel: "Comment",
      memberName: actorName,
      description: "Commented on your post.",
      timestampLabel: formatNotificationTimestamp(createdAt),
      sortTimestamp: Date.parse(createdAt) || 0,
      countsTowardBadge: isUnseen(createdAt),
      actorUserId: String(comment.user_id),
      feedTarget: { postId: String(comment.post_id) },
    });
  }

  for (const like of likes ?? []) {
    const createdAt = String(like.created_at ?? "");
    const actorName = nameByUserId.get(String(like.user_id)) ?? "A member";
    items.push({
      id: `like:${like.id}`,
      kind: "like",
      typeLabel: "Appreciation",
      memberName: actorName,
      description: "Appreciated your post.",
      timestampLabel: formatNotificationTimestamp(createdAt),
      sortTimestamp: Date.parse(createdAt) || 0,
      countsTowardBadge: isUnseen(createdAt),
      actorUserId: String(like.user_id),
      feedTarget: { postId: String(like.post_id) },
    });
  }

  for (const post of opportunities ?? []) {
    const createdAt = String(post.created_at ?? "");
    const isGame = String(post.post_type) === "looking-for-game";
    const { data: actorProfile } = await client
      .from("member_profiles")
      .select("full_name")
      .eq("user_id", String(post.user_id))
      .maybeSingle();
    const actorName = String(actorProfile?.full_name ?? "A member");
    items.push({
      id: `${isGame ? "game" : "travel"}:${post.id}`,
      kind: isGame ? "game_request" : "travel_match",
      typeLabel: isGame ? "Game request" : "Travel match",
      memberName: actorName,
      description: isGame ? "Is looking for a game." : "Shared travel plans.",
      timestampLabel: formatNotificationTimestamp(createdAt),
      sortTimestamp: Date.parse(createdAt) || 0,
      countsTowardBadge: isUnseen(createdAt),
      actorUserId: String(post.user_id),
      feedTarget: { postId: String(post.id) },
    });
  }

  void ownPosts;
  return items;
}

async function attachNotificationAvatars(
  items: PortalNotificationItem[],
): Promise<PortalNotificationItem[]> {
  const userIds = [
    ...new Set(
      items
        .map((item) => item.actorUserId)
        .filter((userId): userId is string => Boolean(userId?.trim())),
    ),
  ];

  if (userIds.length === 0) {
    return items;
  }

  const client = requireSupabase();
  const { data: profiles } = await client
    .from("member_profiles")
    .select("user_id, club_logo_url")
    .in("user_id", userIds);

  const avatarByUserId = new Map(
    (profiles ?? []).map((profile) => [
      String(profile.user_id),
      profile.club_logo_url ? String(profile.club_logo_url) : null,
    ]),
  );

  return items.map((item) => {
    if (item.avatarImageUrl) {
      return item;
    }

    const actorUserId = item.actorUserId;
    if (!actorUserId) {
      return item;
    }

    return {
      ...item,
      avatarImageUrl: avatarByUserId.get(actorUserId) ?? null,
    };
  });
}

export async function fetchPortalNotificationFeed() {
  const { userId, error: sessionError } = await getCurrentUserId();
  if (sessionError || !userId) {
    return {
      notifications: [] as PortalNotificationItem[],
      error: sessionError?.message ?? null,
    };
  }

  const [conversationsResult, introductionResult, seenIds, lastSeenAt] = await Promise.all([
    fetchConversations(),
    fetchIntroductionRequests(),
    getSeenIntroductionRequestIds(userId),
    getLastSeenNetworkActivityAt(userId),
  ]);

  const messageItems = buildUnreadMessageNotifications(conversationsResult.data);
  const introductionItems = buildIntroductionNotifications({
    requests: introductionResult.data,
    currentUserId: userId,
    seenIntroductionRequestIds: seenIds,
  });

  const networkItems = await fetchNetworkNotifications(userId, lastSeenAt);

  const notifications = await attachNotificationAvatars(
    [...messageItems, ...introductionItems, ...networkItems].sort(
      (left, right) => right.sortTimestamp - left.sortTimestamp,
    ),
  );

  return {
    notifications,
    error: conversationsResult.error?.message ?? introductionResult.error?.message ?? null,
  };
}

export function getIntroductionCounterpartForRequest(
  request: MobileIntroductionRequest,
  currentUserId: string,
) {
  return {
    name: getIntroductionCounterpartName(request, currentUserId),
    userId: getIntroductionCounterpartUserId(request, currentUserId),
  };
}
