import { describe, expect, it } from "vitest";
import {
  buildMemberDestinationSearchPlans,
  expandMemberLocationSearchTerms,
  paddedAbbreviationLikeTerms,
} from "./member-location.ts";

describe("expandMemberLocationSearchTerms", () => {
  it("expands NY and NYC to New York terms without bare ny alone", () => {
    const ny = expandMemberLocationSearchTerms("NY");
    expect(ny).toEqual(expect.arrayContaining(["new york", "nyc"]));
    expect(ny).toEqual(expect.arrayContaining(["ny ", " ny"]));
    expect(ny).not.toContain("ny");

    const nyc = expandMemberLocationSearchTerms("NYC");
    expect(nyc).toEqual(expect.arrayContaining(["new york", "nyc"]));

    const full = expandMemberLocationSearchTerms("New York");
    expect(full).toEqual(expect.arrayContaining(["new york", "nyc", "ny "]));
  });

  it("expands FL/Florida with padded FL forms, never bare fl", () => {
    const fl = expandMemberLocationSearchTerms("FL");
    expect(fl).toEqual(expect.arrayContaining(["florida", "fl "]));
    expect(fl).not.toContain("fl");

    const florida = expandMemberLocationSearchTerms("Florida");
    expect(florida).toEqual(expect.arrayContaining(["florida", "fl "]));
    expect(florida).not.toContain("fl");
  });

  it("keeps Miami as a direct term", () => {
    expect(expandMemberLocationSearchTerms("Miami")).toEqual(["miami"]);
  });

  it("returns empty for blank input", () => {
    expect(expandMemberLocationSearchTerms("")).toEqual([]);
    expect(expandMemberLocationSearchTerms("   ")).toEqual([]);
  });
});

describe("paddedAbbreviationLikeTerms", () => {
  it("never returns a bare two-letter code", () => {
    expect(paddedAbbreviationLikeTerms("fl")).not.toContain("fl");
    expect(paddedAbbreviationLikeTerms("ny")).not.toContain("ny");
  });
});

describe("buildMemberDestinationSearchPlans", () => {
  it("uses OR-style plans for Florida destinations without AND location+travel", () => {
    const plans = buildMemberDestinationSearchPlans({
      location: "Florida",
      travel: "",
      maxPlans: 4,
    });
    expect(plans.every((plan) => !(plan.location && plan.travel))).toBe(true);
    expect(plans.some((plan) => plan.location === "florida")).toBe(true);
    expect(plans.some((plan) => plan.location.includes("fl"))).toBe(true);
  });

  it("does not AND the same destination into location and travel", () => {
    const plans = buildMemberDestinationSearchPlans({
      location: "Florida",
      travel: "Florida",
      maxPlans: 8,
    });
    expect(plans.some((plan) => plan.location && plan.travel)).toBe(false);
  });
});
