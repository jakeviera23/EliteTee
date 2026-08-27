import type { IntroductionRequestRecord } from "../types/introductionRequest";

const SEEN_INTRO_REQUESTS_KEY = (userId: string) => `elitetee-seen-intro-requests:${userId}`;
const SEEN_FEED_LIKE_KEYS_KEY = (userId: string) => `elitetee-seen-feed-likes:${userId}`;
const SEEN_MESSAGE_NOTIFICATION_KEYS_KEY = (userId: string) =>
  `elitetee-seen-message-notifications:${userId}`;

export function buildMessageNotificationSeenKey(otherUserId: string, lastMessageAt: string) {
  return `${otherUserId.trim()}:${lastMessageAt.trim()}`;
}

export function getSeenMessageNotificationKeys(userId: string) {
  try {
    const raw = localStorage.getItem(SEEN_MESSAGE_NOTIFICATION_KEYS_KEY(userId));
    if (!raw) return new Set<string>();

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set<string>();

    return new Set(parsed.map(String));
  } catch {
    return new Set<string>();
  }
}

export function markMessageNotificationsSeen(userId: string, seenKeys: string[]) {
  if (seenKeys.length === 0) return;

  const seen = getSeenMessageNotificationKeys(userId);
  seenKeys.forEach((key) => seen.add(key));
  localStorage.setItem(SEEN_MESSAGE_NOTIFICATION_KEYS_KEY(userId), JSON.stringify([...seen]));
}

export function buildFeedLikeSeenKey(postId: string, likerUserId: string) {
  return `${postId.trim()}:${likerUserId.trim()}`;
}

export function getSeenFeedLikeKeys(userId: string) {
  try {
    const raw = localStorage.getItem(SEEN_FEED_LIKE_KEYS_KEY(userId));
    if (!raw) return new Set<string>();

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set<string>();

    return new Set(parsed.map(String));
  } catch {
    return new Set<string>();
  }
}

export function markFeedLikesSeen(userId: string, seenKeys: string[]) {
  if (seenKeys.length === 0) return;

  const seen = getSeenFeedLikeKeys(userId);
  seenKeys.forEach((key) => seen.add(key));
  localStorage.setItem(SEEN_FEED_LIKE_KEYS_KEY(userId), JSON.stringify([...seen]));
}

export function formatNotificationCount(count: number) {
  if (count > 9) return "9+";
  return String(count);
}

export type NotificationBadgeDisplay = "none" | "dot" | "count";

export function getNotificationBadgeDisplay(count: number): NotificationBadgeDisplay {
  if (count <= 0) return "none";
  if (count === 1) return "dot";
  return "count";
}

/** Dropdown width is viewport-based so it does not collapse to the bell button width. */
export const PORTAL_NOTIFICATION_PANEL_WIDTH =
  "min(22.5rem, calc(100vw - 2rem))";

export function getSeenIntroductionRequestIds(userId: string) {
  try {
    const raw = localStorage.getItem(SEEN_INTRO_REQUESTS_KEY(userId));
    if (!raw) return new Set<string>();

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set<string>();

    return new Set(parsed.map(String));
  } catch {
    return new Set<string>();
  }
}

export function markIntroductionRequestsSeen(userId: string, requestIds: string[]) {
  if (requestIds.length === 0) return;

  const seen = getSeenIntroductionRequestIds(userId);
  requestIds.forEach((requestId) => seen.add(requestId));
  localStorage.setItem(SEEN_INTRO_REQUESTS_KEY(userId), JSON.stringify([...seen]));
}

export function countUnseenPendingIntroductionRequests({
  requests,
  userId,
  seenRequestIds,
}: {
  requests: IntroductionRequestRecord[];
  userId: string | null;
  seenRequestIds: Set<string>;
}) {
  if (!userId) return 0;

  return requests.filter(
    (request) =>
      request.status === "pending" &&
      request.receiver_id === userId &&
      !seenRequestIds.has(request.id),
  ).length;
}

export function getPendingReceivedIntroductionRequestIds(
  requests: IntroductionRequestRecord[],
  userId: string | null,
) {
  if (!userId) return [];

  return requests
    .filter((request) => request.status === "pending" && request.receiver_id === userId)
    .map((request) => request.id);
}

export function buildRequestsNotificationLabel({
  unreadMessageCount,
  unseenIntroductionCount,
}: {
  unreadMessageCount: number;
  unseenIntroductionCount: number;
}) {
  const parts: string[] = [];

  if (unreadMessageCount > 0) {
    parts.push(
      `${unreadMessageCount} unread message${unreadMessageCount === 1 ? "" : "s"}`,
    );
  }

  if (unseenIntroductionCount > 0) {
    parts.push(
      `${unseenIntroductionCount} new member introduction${unseenIntroductionCount === 1 ? "" : "s"}`,
    );
  }

  return parts.join(", ");
}
