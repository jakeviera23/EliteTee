import { describe, expect, it } from "vitest";
import type { MemberProfileRecord } from "../types/memberProfileRecord";
import { buildMemberOnboardingSteps, countCompletedOnboardingSteps } from "./memberOnboarding";

function profile(overrides: Partial<MemberProfileRecord> = {}): MemberProfileRecord {
  return {
    id: "profile-1",
    user_id: "viewer",
    full_name: "Founding Member",
    email: "",
    primary_club: "National Golf Links",
    additional_clubs: [],
    based_in: "Southampton, New York, United States",
    regions: ["New York"],
    industry: "Hospitality",
    golf_interests: ["Architecture"],
    business_interests: [],
    current_request: "Looking for games in Florida.",
    traveling_to: "",
    handicap: "",
    bucket_list_course_ids: ["course-1"],
    club_logo_url: null,
    cover_photo_url: null,
    membership_status: "Founding Member",
    is_verified: true,
    founding_member_number: "FM-001",
    portal_access_enabled: true,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("member onboarding", () => {
  it("derives completion only from existing member data", () => {
    const steps = buildMemberOnboardingSteps({
      profile: profile(),
      contributionCount: 1,
      currentUserId: "viewer",
      introductionRequests: [
        {
          id: "intro-1",
          sender_id: "viewer",
          receiver_id: "member-2",
          status: "pending",
          request_type: "golf",
          message: "Would enjoy meeting.",
          created_at: "2026-01-02T00:00:00.000Z",
          accepted_at: null,
          response_message: null,
        },
      ],
    });

    expect(countCompletedOnboardingSteps(steps)).toBe(5);
  });

  it("does not treat an unanswered incoming request as completed member action", () => {
    const steps = buildMemberOnboardingSteps({
      profile: profile({ bucket_list_course_ids: [] }),
      contributionCount: 0,
      currentUserId: "viewer",
      introductionRequests: [
        {
          id: "intro-1",
          sender_id: "member-2",
          receiver_id: "viewer",
          status: "pending",
          request_type: "golf",
          message: "Would enjoy meeting.",
          created_at: "2026-01-02T00:00:00.000Z",
          accepted_at: null,
          response_message: null,
        },
      ],
    });

    expect(steps.find((step) => step.id === "introduction")?.complete).toBe(false);
    expect(steps.find((step) => step.id === "saved-course")?.complete).toBe(false);
  });
});
