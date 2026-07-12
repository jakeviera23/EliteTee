import { describe, expect, it } from "vitest";
import {
  canMemberEditMemberSubmittedCourseLocation,
  shouldRejectProviderCourseLocationEdit,
  validateStructuredCourseLocationInput,
} from "./memberSubmittedCourseLocation";

describe("member-submitted course location authorization", () => {
  it("allows the round owner to edit member-submitted course location", () => {
    expect(
      canMemberEditMemberSubmittedCourseLocation({
        course: { submitted_by_member: true, source_name: "member_submitted" },
        roundOwnerUserId: "user-1",
        currentUserId: "user-1",
      }),
    ).toBe(true);
  });

  it("rejects non-owners even for member-submitted courses", () => {
    expect(
      canMemberEditMemberSubmittedCourseLocation({
        course: { submitted_by_member: true, source_name: "member_submitted" },
        roundOwnerUserId: "user-1",
        currentUserId: "user-2",
      }),
    ).toBe(false);
  });

  it("rejects provider-owned course location edits by members", () => {
    expect(
      canMemberEditMemberSubmittedCourseLocation({
        course: { submitted_by_member: false, source_name: "elitetee_seed" },
        roundOwnerUserId: "user-1",
        currentUserId: "user-1",
      }),
    ).toBe(false);

    expect(
      shouldRejectProviderCourseLocationEdit({
        submitted_by_member: false,
        source_name: "elitetee_seed",
      }),
    ).toBe(true);
  });

  it("requires city, region, and country for structured updates", () => {
    expect(
      validateStructuredCourseLocationInput({
        city: "Southampton",
        region: "NY",
        country: "United States",
      }).ok,
    ).toBe(true);

    expect(
      validateStructuredCourseLocationInput({
        city: "Southampton",
        region: "",
        country: "United States",
      }).ok,
    ).toBe(false);
  });
});
