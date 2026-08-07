import { describe, expect, it } from "vitest";
import { shouldRefreshMemberExperience } from "./foregroundRefresh";

describe("shouldRefreshMemberExperience", () => {
  it("refreshes initially and again only after the request guard expires", () => {
    expect(shouldRefreshMemberExperience(0, 100_000)).toBe(true);
    expect(shouldRefreshMemberExperience(50_000, 94_999)).toBe(false);
    expect(shouldRefreshMemberExperience(50_000, 95_000)).toBe(true);
  });
});
