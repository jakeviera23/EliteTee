import { describe, expect, it } from "vitest";
import {
  hoursOpen,
  isReportApproachingDeadline,
  isReportPastDeadline,
} from "./adminModeration";

describe("admin moderation timing helpers", () => {
  const createdAt = "2026-11-18T12:00:00.000Z";
  const base = Date.parse(createdAt);

  it("computes open hours", () => {
    expect(hoursOpen(createdAt, base + 90 * 60 * 1000)).toBeCloseTo(1.5, 5);
  });

  it("flags reports approaching 24 hours", () => {
    expect(isReportApproachingDeadline(createdAt, base + 19 * 60 * 60 * 1000)).toBe(true);
    expect(isReportApproachingDeadline(createdAt, base + 10 * 60 * 60 * 1000)).toBe(false);
  });

  it("flags reports past 24 hours", () => {
    expect(isReportPastDeadline(createdAt, base + 25 * 60 * 60 * 1000)).toBe(true);
    expect(isReportPastDeadline(createdAt, base + 23 * 60 * 60 * 1000)).toBe(false);
  });
});
