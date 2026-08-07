import type { IntroductionRequestRecord } from "../types/introductionRequest";
import type { MemberProfileRecord } from "../types/memberProfileRecord";

export type ProfileCompletion = {
  completed: number;
  total: number;
  percentage: number;
  missing: string[];
};

export function calculateProfileCompletion(profile: MemberProfileRecord): ProfileCompletion {
  const fields = [
    ["name", profile.full_name.trim().length > 0],
    ["location", profile.based_in.trim().length > 0],
    ["industry", profile.industry.trim().length > 0],
    ["current request", profile.current_request.trim().length > 0],
    ["home club", profile.primary_club.trim().length > 0],
    ["golf interests", profile.golf_interests.some((interest) => interest.trim().length > 0)],
    ["profile photo", Boolean(profile.club_logo_url?.trim())],
    ["cover photo", Boolean(profile.cover_photo_url?.trim())],
  ] as const;
  const completed = fields.filter(([, isComplete]) => isComplete).length;

  return {
    completed,
    total: fields.length,
    percentage: Math.round((completed / fields.length) * 100),
    missing: fields.filter(([, isComplete]) => !isComplete).map(([label]) => label),
  };
}

export function countAcceptedIntroductionConnections(
  requests: IntroductionRequestRecord[],
  userId: string | null,
): number {
  if (!userId) return 0;
  const counterpartIds = new Set<string>();
  for (const request of requests) {
    if (request.status !== "accepted") continue;
    if (request.sender_id === userId) counterpartIds.add(request.receiver_id);
    if (request.receiver_id === userId) counterpartIds.add(request.sender_id);
  }
  counterpartIds.delete(userId);
  counterpartIds.delete("");
  return counterpartIds.size;
}
