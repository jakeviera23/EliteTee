import { describe, expect, it } from "vitest";
import {
  formatCourseRatingDisplay,
  formatMemberRatingSummary,
  normalizeCourseRating,
  validateCourseRating,
} from "./courseRating";

describe("validateCourseRating", () => {
  it("accepts 9.4", () => {
    expect(validateCourseRating(9.4)).toEqual({ ok: true, value: 9.4 });
  });

  it("accepts 10.0", () => {
    expect(validateCourseRating(10)).toEqual({ ok: true, value: 10 });
  });

  it("accepts 1.0", () => {
    expect(validateCourseRating(1)).toEqual({ ok: true, value: 1 });
  });

  it("rejects 10.1", () => {
    expect(validateCourseRating(10.1).ok).toBe(false);
  });

  it("rejects 0.9", () => {
    expect(validateCourseRating(0.9).ok).toBe(false);
  });

  it("normalizes floating-point noise to one decimal", () => {
    expect(validateCourseRating(8.7000000001)).toEqual({ ok: true, value: 8.7 });
  });
});

describe("formatCourseRatingDisplay", () => {
  it("displays existing 9 as 9.0", () => {
    expect(formatCourseRatingDisplay(9)).toBe("9.0");
  });

  it("displays 10 as 10.0", () => {
    expect(formatCourseRatingDisplay(10)).toBe("10.0");
  });

  it("displays 9.4 as 9.4", () => {
    expect(formatCourseRatingDisplay(9.4)).toBe("9.4");
  });

  it("returns null for invalid values", () => {
    expect(formatCourseRatingDisplay(10.1)).toBeNull();
    expect(formatCourseRatingDisplay(null)).toBeNull();
  });
});

describe("formatMemberRatingSummary", () => {
  it("formats averages to one decimal", () => {
    expect(formatMemberRatingSummary(9.4, 2)).toEqual({
      score: "9.4 / 10.0",
      detail: "Based on 2 member reviews",
    });
  });

  it("averages 9.0 and 9.4 to one decimal", () => {
    const average = (9.0 + 9.4) / 2;
    expect(formatMemberRatingSummary(average, 2).score).toBe("9.2 / 10.0");
  });
});

describe("normalizeCourseRating", () => {
  it("rounds to one decimal", () => {
    expect(normalizeCourseRating(9.44)).toBe(9.4);
  });
});
