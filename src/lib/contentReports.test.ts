import { describe, expect, it } from "vitest";
import { CONTENT_REPORT_REASONS, formatContentReportError } from "./contentReports";

describe("content report helpers", () => {
  it("exposes required Apple-facing report reasons", () => {
    const values = CONTENT_REPORT_REASONS.map((reason) => reason.value);
    expect(values).toEqual([
      "harassment",
      "inappropriate_content",
      "spam",
      "other",
    ]);
  });

  it("maps duplicate and missing-target errors to member-facing copy", () => {
    expect(
      formatContentReportError(new Error("You already have an open report for this content.")),
    ).toMatch(/already have an open report/i);
    expect(formatContentReportError(new Error("That post could not be found."))).toMatch(
      /no longer available/i,
    );
  });
});
