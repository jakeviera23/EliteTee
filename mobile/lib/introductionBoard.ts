import type { IntroductionTab, MobileIntroductionRequest } from "@/types/introduction";

export type CategorizedIntroductionRequests = Record<IntroductionTab, MobileIntroductionRequest[]>;

export function categorizeIntroductionRequests(
  requests: MobileIntroductionRequest[],
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

export function getIntroductionCounterpartName(
  request: MobileIntroductionRequest,
  currentUserId: string,
): string {
  if (request.sender_id === currentUserId) {
    return request.receiver_name?.trim() || "Member";
  }
  return request.sender_name?.trim() || "Member";
}

export function getIntroductionCounterpartUserId(
  request: MobileIntroductionRequest,
  currentUserId: string,
): string {
  return request.sender_id === currentUserId ? request.receiver_id : request.sender_id;
}
