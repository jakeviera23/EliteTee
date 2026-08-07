import { describe, expect, it } from "vitest";
import { buildConversationContext, buildConversationStarter } from "./conversationContext";

const baseProfile = {
  user_id: "viewer",
  primary_club: "Seminole Golf Club",
  additional_clubs: [],
  based_in: "Palm Beach, FL",
  regions: ["Florida"],
  golf_interests: ["Golf travel"],
  business_interests: [],
  traveling_to: "",
};

describe("conversation context", () => {
  it("uses existing relationship signals and never invents generic context", () => {
    const context = buildConversationContext({
      viewer: baseProfile,
      member: { ...baseProfile, user_id: "member" },
      introductionRequests: [],
      viewerRounds: [],
      memberRounds: [],
    });

    expect(context.map((item) => item.kind)).toEqual(["club", "interest", "location"]);
    expect(buildConversationStarter("Ryan Smith", context)).toContain("seminole golf club");
  });

  it("returns no context when either member is unavailable", () => {
    expect(
      buildConversationContext({
        viewer: null,
        member: null,
        introductionRequests: [],
        viewerRounds: [],
        memberRounds: [],
      }),
    ).toEqual([]);
  });
});
