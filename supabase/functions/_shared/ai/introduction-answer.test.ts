import { describe, expect, it } from "vitest";
import {
  buildIntroductionMembersAnswer,
  isGenericInsufficientDataAnswer,
} from "./introduction-answer.ts";
import type { RetrievedMember, ScoredMember } from "./types.ts";

function member(overrides: Partial<RetrievedMember>): RetrievedMember {
  return {
    user_id: "user-1",
    full_name: "Wes Patterson",
    primary_club: "Test Club",
    based_in: "FL and NY and Sweden",
    regions: "",
    industry: "",
    golf_interests: "Links golf",
    business_interests: "",
    traveling_to: "Florida",
    current_request: "Member introductions",
    ...overrides,
  };
}

function scored(overrides: Partial<RetrievedMember> = {}, signals: string[] = []): ScoredMember {
  return {
    member: member(overrides),
    score: 50,
    signals,
  };
}

describe("buildIntroductionMembersAnswer", () => {
  it("one Florida candidate → grounded answer, never generic insufficient-data", () => {
    const answer = buildIntroductionMembersAnswer({
      destination: "Florida",
      scored: [scored()],
    });
    expect(answer).toContain("Wes Patterson");
    expect(answer.toLowerCase()).toContain("florida");
    expect(isGenericInsufficientDataAnswer(answer)).toBe(false);
    expect(answer).toMatch(/based in|travel interests|golf interests|looking for/i);
  });

  it("multiple Florida candidates → grounded answer", () => {
    const answer = buildIntroductionMembersAnswer({
      destination: "Florida",
      scored: [
        scored({ user_id: "a", full_name: "Wes Patterson" }),
        scored({
          user_id: "b",
          full_name: "Alex Riviera",
          based_in: "Miami, FL",
          traveling_to: "",
          golf_interests: "Private clubs",
          current_request: "",
        }),
      ],
    });
    expect(answer).toContain("Wes Patterson");
    expect(answer).toContain("Alex Riviera");
    expect(isGenericInsufficientDataAnswer(answer)).toBe(false);
  });

  it("zero Florida candidates → empty string so insufficient-data remains allowed", () => {
    expect(
      buildIntroductionMembersAnswer({
        destination: "Florida",
        scored: [],
      }),
    ).toBe("");
  });
});

describe("isGenericInsufficientDataAnswer", () => {
  it("detects generic insufficient-data phrasing", () => {
    expect(isGenericInsufficientDataAnswer("I do not have enough EliteTee data yet.")).toBe(true);
    expect(isGenericInsufficientDataAnswer("Wes Patterson looks relevant.")).toBe(false);
  });
});
