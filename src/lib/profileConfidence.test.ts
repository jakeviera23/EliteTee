import { describe, expect, it } from "vitest";
import type { IntroductionRequestRecord } from "../types/introductionRequest";
import type { MemberProfileRecord } from "../types/memberProfileRecord";
import { calculateProfileCompletion, countAcceptedIntroductionConnections } from "./profileConfidence";

const profile = {
  full_name: "Member",
  based_in: "Florida",
  industry: "Finance",
  current_request: "Looking for a game",
  primary_club: "Seminole",
  golf_interests: ["Architecture"],
  club_logo_url: null,
  cover_photo_url: null,
} as MemberProfileRecord;

describe("calculateProfileCompletion", () => {
  it("reports a deterministic percentage and missing fields", () => {
    expect(calculateProfileCompletion(profile)).toEqual({
      completed: 6,
      total: 8,
      percentage: 75,
      missing: ["profile photo", "cover photo"],
    });
  });
});

describe("countAcceptedIntroductionConnections", () => {
  it("counts unique accepted counterparts only", () => {
    const base = { request_type: "General Introduction", message: "", created_at: "2026-01-01" };
    const requests = [
      { ...base, id: "1", sender_id: "viewer", receiver_id: "a", status: "accepted" },
      { ...base, id: "2", sender_id: "a", receiver_id: "viewer", status: "accepted" },
      { ...base, id: "3", sender_id: "viewer", receiver_id: "b", status: "pending" },
      { ...base, id: "4", sender_id: "c", receiver_id: "viewer", status: "accepted" },
    ] as IntroductionRequestRecord[];
    expect(countAcceptedIntroductionConnections(requests, "viewer")).toBe(2);
  });
});
