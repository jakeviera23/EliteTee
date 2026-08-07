import type { IntroductionRequestRecord } from "../types/introductionRequest";
import type { MemberProfileRecord } from "../types/memberProfileRecord";
import { buildMatchReasons, scoreMemberRelevance } from "./discoverDirectory";

export type IntroductionRecommendation = {
  member: MemberProfileRecord;
  reasons: string[];
  score: number;
};

function hasExistingRelationship(
  memberUserId: string | null,
  viewerUserId: string | null,
  requests: IntroductionRequestRecord[],
) {
  if (!memberUserId || !viewerUserId) return true;

  return requests.some(
    (request) =>
      request.status !== "declined" &&
      ((request.sender_id === viewerUserId && request.receiver_id === memberUserId) ||
        (request.receiver_id === viewerUserId && request.sender_id === memberUserId)),
  );
}

export function buildIntroductionRecommendations({
  viewer,
  members,
  requests,
  limit = 3,
}: {
  viewer: MemberProfileRecord | null;
  members: MemberProfileRecord[];
  requests: IntroductionRequestRecord[];
  limit?: number;
}): IntroductionRecommendation[] {
  if (!viewer?.user_id) return [];

  return members
    .filter(
      (member) =>
        member.user_id !== viewer.user_id &&
        !hasExistingRelationship(member.user_id, viewer.user_id, requests),
    )
    .map((member) => ({
      member,
      reasons: buildMatchReasons(viewer, member).slice(0, 3),
      score: scoreMemberRelevance(viewer, member),
    }))
    .filter((recommendation) => recommendation.score > 0 && recommendation.reasons.length > 0)
    .sort(
      (left, right) =>
        right.score - left.score || left.member.full_name.localeCompare(right.member.full_name),
    )
    .slice(0, limit);
}
