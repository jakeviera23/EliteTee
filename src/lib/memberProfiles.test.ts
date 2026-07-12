import { describe, expect, it } from "vitest";
import { formatDiscoverMemberLoadError } from "./portalDiscoverErrors";
import { isMissingColumnError } from "./memberProfiles";

describe("isMissingColumnError", () => {
  it("detects PostgREST missing column errors", () => {
    expect(
      isMissingColumnError({
        message: 'column member_profiles.cover_photo_url does not exist',
      }),
    ).toBe(true);
  });

  it("detects schema cache missing column errors", () => {
    expect(
      isMissingColumnError({
        message: "Could not find the 'cover_photo_url' column of 'member_profiles' in the schema cache",
      }),
    ).toBe(true);
  });
});

describe("formatDiscoverMemberLoadError", () => {
  it("includes raw Supabase details in development", () => {
    const message = formatDiscoverMemberLoadError({
      code: "42703",
      message: "column member_profiles.cover_photo_url does not exist",
    });

    expect(message).toContain("cover_photo_url");
    expect(message).toContain("[Dev");
  });
});
