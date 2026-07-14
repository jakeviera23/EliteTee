import { describe, expect, it } from "vitest";
import {
  isPublishedGolfCourseLifecycle,
  mapLegacyModerationStatusToLifecycle,
  mapLifecycleStatusToLegacyModeration,
} from "./golfCourseLifecycle";

describe("golfCourseLifecycle", () => {
  it("maps legacy moderation statuses to lifecycle statuses", () => {
    expect(mapLegacyModerationStatusToLifecycle("active")).toBe("published");
    expect(mapLegacyModerationStatusToLifecycle("pending")).toBe("pending_review");
    expect(mapLegacyModerationStatusToLifecycle("hidden")).toBe("hidden");
    expect(mapLegacyModerationStatusToLifecycle(null)).toBe("published");
  });

  it("maps lifecycle statuses back to legacy moderation values", () => {
    expect(mapLifecycleStatusToLegacyModeration("published")).toBe("active");
    expect(mapLifecycleStatusToLegacyModeration("pending_review")).toBe("pending");
    expect(mapLifecycleStatusToLegacyModeration("draft")).toBe("pending");
    expect(mapLifecycleStatusToLegacyModeration("hidden")).toBe("hidden");
  });

  it("identifies published lifecycle courses", () => {
    expect(isPublishedGolfCourseLifecycle("published")).toBe(true);
    expect(isPublishedGolfCourseLifecycle("draft")).toBe(false);
  });
});
