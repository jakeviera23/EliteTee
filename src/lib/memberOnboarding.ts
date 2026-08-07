import type { IntroductionRequestRecord } from "../types/introductionRequest";
import type { MemberProfileRecord } from "../types/memberProfileRecord";

export type MemberOnboardingStepId =
  | "profile"
  | "golf-identity"
  | "saved-course"
  | "contribution"
  | "introduction";

export type MemberOnboardingStep = {
  id: MemberOnboardingStepId;
  title: string;
  description: string;
  actionLabel: string;
  complete: boolean;
};

export function buildMemberOnboardingSteps({
  profile,
  contributionCount,
  introductionRequests,
  currentUserId,
}: {
  profile: MemberProfileRecord | null;
  contributionCount: number;
  introductionRequests: IntroductionRequestRecord[];
  currentUserId: string | null;
}): MemberOnboardingStep[] {
  const hasProfileContext = Boolean(
    profile?.full_name.trim() &&
      profile.based_in.trim() &&
      profile.industry.trim() &&
      profile.current_request.trim(),
  );
  const hasGolfIdentity = Boolean(
    profile?.primary_club.trim() && profile.golf_interests.some((interest) => interest.trim()),
  );
  const hasSavedCourse = Boolean(profile?.bucket_list_course_ids.some((id) => id.trim()));
  const hasIntroductionProgress = Boolean(
    currentUserId &&
      introductionRequests.some((request) => {
        if (request.status === "accepted") {
          return request.sender_id === currentUserId || request.receiver_id === currentUserId;
        }
        return request.status === "pending" && request.sender_id === currentUserId;
      }),
  );

  return [
    {
      id: "profile",
      title: "Complete your member profile",
      description: "Add your location, industry, and what you hope to find through EliteTee.",
      actionLabel: "Complete profile",
      complete: hasProfileContext,
    },
    {
      id: "golf-identity",
      title: "Add clubs and golf interests",
      description: "Help members understand where you play and what parts of the game matter to you.",
      actionLabel: "Add golf details",
      complete: hasGolfIdentity,
    },
    {
      id: "saved-course",
      title: "Save a course",
      description: "Start a bucket list that can shape future recommendations and conversations.",
      actionLabel: "Explore courses",
      complete: hasSavedCourse,
    },
    {
      id: "contribution",
      title: "Make your first contribution",
      description: "Introduce yourself, share a round, or ask the member community a useful question.",
      actionLabel: "Create a post",
      complete: contributionCount > 0,
    },
    {
      id: "introduction",
      title: "Begin an introduction",
      description: "Request a considered introduction or respond to an incoming request.",
      actionLabel: "View introductions",
      complete: hasIntroductionProgress,
    },
  ];
}

export function countCompletedOnboardingSteps(steps: MemberOnboardingStep[]): number {
  return steps.filter((step) => step.complete).length;
}
