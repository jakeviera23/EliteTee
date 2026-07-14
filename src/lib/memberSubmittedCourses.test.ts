import { describe, expect, it, vi } from "vitest";

const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }));

vi.mock("./supabase", () => ({
  supabase: { rpc: rpcMock },
}));

import {
  canEditMemberSubmittedCourse,
  canEditMemberSubmittedCourseRecord,
} from "./memberSubmittedCourses";

const legacyMemberSubmittedCourse = {
  source_name: "member_submitted" as const,
  submitted_by_member: true,
  created_by_user_id: null,
};

describe("canEditMemberSubmittedCourseRecord", () => {
  it("denies the original submitter when legacy ownership was never backfilled", () => {
    expect(
      canEditMemberSubmittedCourseRecord(legacyMemberSubmittedCourse, "user-original", false),
    ).toBe(false);
  });

  it("allows the original submitter after ownership backfill", () => {
    expect(
      canEditMemberSubmittedCourseRecord(
        { ...legacyMemberSubmittedCourse, created_by_user_id: "user-original" },
        "user-original",
        false,
      ),
    ).toBe(true);
  });

  it("denies a different member even after backfill", () => {
    expect(
      canEditMemberSubmittedCourseRecord(
        { ...legacyMemberSubmittedCourse, created_by_user_id: "user-original" },
        "user-other",
        false,
      ),
    ).toBe(false);
  });

  it("allows admins for legacy courses without ownership", () => {
    expect(
      canEditMemberSubmittedCourseRecord(legacyMemberSubmittedCourse, "admin-user", true),
    ).toBe(true);
  });

  it("never allows editing curated courses", () => {
    expect(
      canEditMemberSubmittedCourseRecord(
        {
          source_name: "elitetee_curated",
          submitted_by_member: false,
          created_by_user_id: "user-original",
        },
        "user-original",
        false,
      ),
    ).toBe(false);
  });
});

describe("canEditMemberSubmittedCourse", () => {
  it("returns a boolean for RPC result", async () => {
    rpcMock.mockResolvedValueOnce({ data: true, error: null });
    const { data, error } = await canEditMemberSubmittedCourse("course-1");
    expect(error).toBeNull();
    expect(data).toBe(true);
  });

  it("surfaces RPC errors to callers", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: new Error("permission check failed") });
    const { data, error } = await canEditMemberSubmittedCourse("course-1");
    expect(data).toBeNull();
    expect(error?.message).toBe("permission check failed");
  });
});
