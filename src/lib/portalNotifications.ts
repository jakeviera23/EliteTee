import type { IntroductionRequestRecord } from "../types/introductionRequest";

const SEEN_INTRO_REQUESTS_KEY = (userId: string) => `elitetee-seen-intro-requests:${userId}`;

export function formatNotificationCount(count: number) {
  if (count > 9) return "9+";
  return String(count);
}

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
