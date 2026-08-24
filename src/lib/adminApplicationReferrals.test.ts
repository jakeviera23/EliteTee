import { describe, expect, it } from "vitest";
import { formatApplicationReferrerLine } from "./adminApplicationReferrals";

describe("formatApplicationReferrerLine", () => {
  it("formats referrer name with founding member number", () => {
    expect(
      formatApplicationReferrerLine({
        full_name: "Jordan Lee",
        founding_member_number: "FM-014",
      }),
    ).toBe("Jordan Lee (FM-014)");
  });

  it("formats referrer name without founding member number", () => {
    expect(
      formatApplicationReferrerLine({
        full_name: "Jordan Lee",
        founding_member_number: null,
      }),
    ).toBe("Jordan Lee");
  });

  it("returns null when referrer is missing", () => {
    expect(formatApplicationReferrerLine(null)).toBeNull();
  });
});
