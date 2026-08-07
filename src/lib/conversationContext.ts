import type { IntroductionRequestRecord } from "../types/introductionRequest";
import type { MemberCourseRoundRecord } from "../types/memberCourseRound";

export type ConversationProfile = {
  user_id: string | null;
  primary_club: string;
  additional_clubs: string[];
  based_in: string;
  regions: string[];
  golf_interests: string[];
  business_interests: string[];
  traveling_to: string;
};

export type ConversationContextItem = {
  kind: "introduction" | "club" | "course" | "travel" | "interest" | "location";
  label: string;
};

function normalized(value: string) {
  return value.trim().toLowerCase();
}

function sharedValues(left: string[], right: string[]) {
  const rightSet = new Set(right.map(normalized));
  return left.filter((value) => value.trim() && rightSet.has(normalized(value)));
}

export function buildConversationContext({
  viewer,
  member,
  introductionRequests,
  viewerRounds,
  memberRounds,
}: {
  viewer: ConversationProfile | null;
  member: ConversationProfile | null;
  introductionRequests: IntroductionRequestRecord[];
  viewerRounds: MemberCourseRoundRecord[];
  memberRounds: MemberCourseRoundRecord[];
}): ConversationContextItem[] {
  if (!viewer?.user_id || !member?.user_id) return [];

  const items: ConversationContextItem[] = [];
  const acceptedIntroduction = introductionRequests.some(
    (request) =>
      request.status === "accepted" &&
      ((request.sender_id === viewer.user_id && request.receiver_id === member.user_id) ||
        (request.receiver_id === viewer.user_id && request.sender_id === member.user_id)),
  );
  if (acceptedIntroduction) {
    items.push({ kind: "introduction", label: "Connected through EliteTee" });
  }

  const viewerClubs = [viewer.primary_club, ...viewer.additional_clubs];
  const memberClubs = [member.primary_club, ...member.additional_clubs];
  const sharedClub = sharedValues(viewerClubs, memberClubs)[0];
  if (sharedClub) items.push({ kind: "club", label: `Both connected to ${sharedClub}` });

  const viewerCourseKeys = new Map(
    viewerRounds.map((round) => [
      round.golf_course_id || normalized(round.course_name),
      round.course_name,
    ]),
  );
  const sharedCourse = memberRounds.find((round) =>
    viewerCourseKeys.has(round.golf_course_id || normalized(round.course_name)),
  );
  if (sharedCourse) {
    items.push({ kind: "course", label: `Both played ${sharedCourse.course_name}` });
  }

  if (
    viewer.traveling_to.trim() &&
    member.based_in.trim() &&
    normalized(member.based_in).includes(normalized(viewer.traveling_to))
  ) {
    items.push({ kind: "travel", label: `Your travel overlaps ${member.based_in}` });
  } else if (
    member.traveling_to.trim() &&
    viewer.based_in.trim() &&
    normalized(viewer.based_in).includes(normalized(member.traveling_to))
  ) {
    items.push({ kind: "travel", label: `Their travel overlaps ${viewer.based_in}` });
  }

  const sharedGolfInterest = sharedValues(viewer.golf_interests, member.golf_interests)[0];
  if (sharedGolfInterest) {
    items.push({ kind: "interest", label: `Shared interest: ${sharedGolfInterest}` });
  } else {
    const sharedBusinessInterest = sharedValues(
      viewer.business_interests,
      member.business_interests,
    )[0];
    if (sharedBusinessInterest) {
      items.push({ kind: "interest", label: `Shared interest: ${sharedBusinessInterest}` });
    }
  }

  if (
    items.length < 3 &&
    viewer.based_in.trim() &&
    normalized(viewer.based_in) === normalized(member.based_in)
  ) {
    items.push({ kind: "location", label: `Both based in ${member.based_in}` });
  } else if (items.length < 3) {
    const sharedRegion = sharedValues(viewer.regions, member.regions)[0];
    if (sharedRegion) items.push({ kind: "location", label: `Shared region: ${sharedRegion}` });
  }

  return items.slice(0, 3);
}

export function buildConversationStarter(
  memberName: string,
  context: ConversationContextItem[],
) {
  const firstName = memberName.trim().split(/\s+/)[0] || "this member";
  const primaryContext = context.find((item) => item.kind !== "introduction");
  if (!primaryContext) return `Send the first note to ${firstName}.`;
  return `Start with your connection: ${primaryContext.label.toLowerCase()}.`;
}
