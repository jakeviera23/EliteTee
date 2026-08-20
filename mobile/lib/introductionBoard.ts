import type { IntroductionTab, MobileIntroductionRequest } from "@/types/introduction";
import { isIntroductionWithdrawn } from "./introductionStatus";

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

export function getIntroductionCounterpartPhotoUrl(
  request: MobileIntroductionRequest,
  currentUserId: string,
): string | null {
  if (request.sender_id === currentUserId) {
    return request.receiver_photo_url ?? null;
  }
  return request.sender_photo_url ?? null;
}

export function getIntroductionCounterpartContext(
  request: MobileIntroductionRequest,
  currentUserId: string,
): { primaryClub: string; basedIn: string } {
  if (request.sender_id === currentUserId) {
    return {
      primaryClub: request.receiver_primary_club ?? "",
      basedIn: request.receiver_based_in ?? "",
    };
  }
  return {
    primaryClub: request.sender_primary_club ?? "",
    basedIn: request.sender_based_in ?? "",
  };
}

export function getIntroductionDirectionLabel(
  request: MobileIntroductionRequest,
  currentUserId: string,
): "Sent" | "Received" {
  return request.sender_id === currentUserId ? "Sent" : "Received";
}

export function getIntroductionStatusLabel(
  request: MobileIntroductionRequest,
  currentUserId: string,
): string {
  const status = request.status.toLowerCase();
  if (status === "pending") {
    return request.sender_id === currentUserId ? "Pending response" : "Needs your response";
  }
  if (status === "accepted") return "Accepted";
  if (isIntroductionWithdrawn(request)) {
    return request.sender_id === currentUserId ? "Withdrawn" : "Withdrawn by requester";
  }
  if (status === "declined") return "Declined";
  return request.status;
}
