import { describe, expect, it } from "vitest";
import type { MemberProfileRecord } from "../types/memberProfileRecord";
import {
  buildGolferProfileDisplay,
  isMeaningfulProfileText,
  partitionProfileDisplayItems,
  PROFILE_TAG_MAX_LENGTH,
} from "./portalProfileDisplay";

function profile(overrides: Partial<MemberProfileRecord> = {}): MemberProfileRecord {
  return {
    id: "profile-1",
    user_id: "user-1",
    full_name: "Jordan Lee",
    email: "",
    primary_club: "National Golf Links",
    additional_clubs: ["Cypress Point", "Pebble Beach"],
    based_in: "Southampton, NY",
    regions: ["Northeast"],
    industry: "Private equity",
    golf_interests: ["Weekend games", "Travel partners"],
    business_interests: ["Hospitality", "Real estate"],
    current_request: "Looking for thoughtful introductions in Florida.",
    traveling_to: "Scotland — September",
    handicap: "8.4",
    bucket_list_course_ids: ["course-a", "course-b"],
    club_logo_url: null,
    cover_photo_url: null,
    membership_status: "approved",
    is_verified: true,
    founding_member_number: "FM-001",
    portal_access_enabled: true,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

describe("isMeaningfulProfileText", () => {
  it("rejects empty and placeholder profile values", () => {
    expect(isMeaningfulProfileText("")).toBe(false);
    expect(isMeaningfulProfileText("   ")).toBe(false);
    expect(isMeaningfulProfileText("Not specified")).toBe(false);
    expect(isMeaningfulProfileText("not shared")).toBe(false);
    expect(isMeaningfulProfileText("N/A")).toBe(false);
    expect(isMeaningfulProfileText("Location not set")).toBe(false);
  });

  it("accepts real profile text", () => {
    expect(isMeaningfulProfileText("Private equity")).toBe(true);
    expect(isMeaningfulProfileText("Scotland — September")).toBe(true);
  });
});

describe("partitionProfileDisplayItems", () => {
  it("splits short tags from long readable text blocks", () => {
    const longInterest =
      "Looking for thoughtful golf partners who enjoy walking courses and post-round conversation.";
    const { tags, textItems } = partitionProfileDisplayItems([
      "Weekend games",
      longInterest,
      "Not specified",
      "Travel partners",
    ]);

    expect(tags).toEqual(["Weekend games", "Travel partners"]);
    expect(textItems).toEqual([longInterest]);
  });

  it("treats multiline values as text cards even when short", () => {
    const { tags, textItems } = partitionProfileDisplayItems(["Line one\nLine two"]);

    expect(tags).toEqual([]);
    expect(textItems).toEqual(["Line one\nLine two"]);
  });

  it("respects the tag length threshold", () => {
    const borderline = "x".repeat(PROFILE_TAG_MAX_LENGTH);
    const tooLong = "x".repeat(PROFILE_TAG_MAX_LENGTH + 1);
    const { tags, textItems } = partitionProfileDisplayItems([borderline, tooLong]);

    expect(tags).toEqual([borderline]);
    expect(textItems).toEqual([tooLong]);
  });
});

describe("buildGolferProfileDisplay", () => {
  it("reads persisted member profile fields from Supabase", () => {
    const display = buildGolferProfileDisplay(profile());

    expect(display).toMatchObject({
      name: "Jordan Lee",
      title: "Private equity",
      location: "Southampton, NY",
      homeCourse: "National Golf Links",
      bio: "Looking for thoughtful introductions in Florida.",
      favoriteCourses: ["Cypress Point", "Pebble Beach"],
      upcomingTravel: "Scotland — September",
      connectionInterests: ["Weekend games", "Travel partners"],
      handicap: 8.4,
      isEmpty: false,
    });
  });

  it("returns polished placeholders when profile is missing", () => {
    const display = buildGolferProfileDisplay(null);

    expect(display.isEmpty).toBe(true);
    expect(display.name).toBe("Your profile");
    expect(display.favoriteCourses).toEqual([]);
    expect(display.handicap).toBeUndefined();
  });
});
