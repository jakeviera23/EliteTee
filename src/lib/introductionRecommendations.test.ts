import { describe, expect, it } from "vitest";
import type { MemberProfileRecord } from "../types/memberProfileRecord";
import { buildIntroductionRecommendations } from "./introductionRecommendations";

function member(overrides: Partial<MemberProfileRecord>): MemberProfileRecord {
  return {
    id: "profile",
    user_id: "user",
    full_name: "Member",
    email: "",
    primary_club: "",
    additional_clubs: [],
    based_in: "",
    regions: [],
    industry: "",
    golf_interests: [],
    business_interests: [],
    current_request: "",
    traveling_to: "",
    handicap: "",
    bucket_list_course_ids: [],
    club_logo_url: null,
    cover_photo_url: null,
    membership_status: "approved",
    is_verified: true,
    founding_member_number: null,
    portal_access_enabled: true,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    ...overrides,
  };
}

describe("buildIntroductionRecommendations", () => {
  it("ranks relevant members and excludes existing relationships", () => {
    const viewer = member({
      user_id: "viewer",
      based_in: "Palm Beach, FL",
      regions: ["Florida"],
      golf_interests: ["Golf travel"],
    });
    const nearby = member({
      user_id: "nearby",
      full_name: "Nearby Member",
      based_in: "Palm Beach, FL",
      regions: ["Florida"],
    });
    const traveler = member({
      user_id: "traveler",
      full_name: "Travel Member",
      golf_interests: ["Golf travel"],
    });

    const result = buildIntroductionRecommendations({
      viewer,
      members: [nearby, traveler],
      requests: [
        {
          id: "request",
          sender_id: "viewer",
          receiver_id: "traveler",
          status: "pending",
          request_type: "General Introduction",
          message: "Hello",
          created_at: "2026-01-02",
        },
      ],
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.member.user_id).toBe("nearby");
    expect(result[0]?.reasons).toContain("Same location");
  });
});
