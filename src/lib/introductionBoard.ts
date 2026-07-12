import type { IntroductionRequestRecord } from "../types/introductionRequest";

export type IntroductionTab = "incoming" | "sent" | "accepted" | "declined";

export type CategorizedIntroductionRequests = Record<IntroductionTab, IntroductionRequestRecord[]>;

export type IntroductionCounterpart = {
  userId: string;
  name: string;
  isIncoming: boolean;
};

export function categorizeIntroductionRequests(
  requests: IntroductionRequestRecord[],
  currentUserId: string | null,
): CategorizedIntroductionRequests {
  const empty: CategorizedIntroductionRequests = {
    incoming: [],
    sent: [],
    accepted: [],
    declined: [],
  };

  if (!currentUserId) return empty;

  for (const request of requests) {
    const status = request.status.toLowerCase();

    if (status === "pending" && request.receiver_id === currentUserId) {
      empty.incoming.push(request);
      continue;
    }

    if (status === "pending" && request.sender_id === currentUserId) {
      empty.sent.push(request);
      continue;
    }

    if (status === "accepted") {
      empty.accepted.push(request);
      continue;
    }

    if (status === "declined") {
      empty.declined.push(request);
    }
  }

  return empty;
}

export function countIntroductionTabs(
  categorized: CategorizedIntroductionRequests,
): Record<IntroductionTab, number> {
  return {
    incoming: categorized.incoming.length,
    sent: categorized.sent.length,
    accepted: categorized.accepted.length,
    declined: categorized.declined.length,
  };
}

export function getIntroductionCounterpart(
  request: IntroductionRequestRecord,
  currentUserId: string,
): IntroductionCounterpart {
  const isIncoming = request.receiver_id === currentUserId;

  if (request.sender_id === currentUserId) {
    return {
      userId: request.receiver_id,
      name: request.receiver_name?.trim() || "Member",
      isIncoming: false,
    };
  }

  return {
    userId: request.sender_id,
    name: request.sender_name?.trim() || "Member",
    isIncoming,
  };
}

export function resolveDirectMessageTarget(
  request: IntroductionRequestRecord,
  currentUserId: string,
): { userId: string; memberName: string } {
  const counterpart = getIntroductionCounterpart(request, currentUserId);
  return { userId: counterpart.userId, memberName: counterpart.name };
}

export function pickDefaultIntroductionTab(
  categorized: CategorizedIntroductionRequests,
): IntroductionTab {
  if (categorized.incoming.length > 0) return "incoming";
  if (categorized.sent.length > 0) return "sent";
  if (categorized.accepted.length > 0) return "accepted";
  if (categorized.declined.length > 0) return "declined";
  return "incoming";
}

export function buildIntroductionTimeline(request: IntroductionRequestRecord): string[] {
  const steps = [`Requested`];
  const status = request.status.toLowerCase();

  if (status === "accepted") {
    steps.push("Accepted");
    steps.push("Conversation available");
  } else if (status === "declined") {
    steps.push("Declined");
  } else {
    steps.push("Awaiting response");
  }

  return steps;
}
