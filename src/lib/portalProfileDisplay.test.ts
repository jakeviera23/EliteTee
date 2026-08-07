import { describe, expect, it } from "vitest";
import type { MemberProfileRecord } from "../types/memberProfileRecord";
import { buildGolferProfileDisplay, formatProfileIndustryForDisplay } from "./portalProfileDisplay";

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

  it("keeps headline-like prose out of the Industry presentation", () => {
    expect(formatProfileIndustryForDisplay("Private equity")).toBe("Private equity");
    expect(formatProfileIndustryForDisplay("Not specified")).toBe("");
    expect(formatProfileIndustryForDisplay("NJ GOLFER LOOKING FOR EPIC GOLF")).toBe("");
    expect(
      formatProfileIndustryForDisplay("Looking to meet members who enjoy architecture and travel."),
    ).toBe("");
  });

  it("presents one primary club and moves extra delimited clubs into the compact list", () => {
    const display = buildGolferProfileDisplay(
      profile({
        primary_club: "Liberty National, Essex County CC; Neshanic Valley",
        additional_clubs: ["Pine Barrens Golf Club", "Essex County CC"],
      }),
    );

    expect(display.homeCourse).toBe("Liberty National");
    expect(display.favoriteCourses).toEqual([
      "Essex County CC",
      "Neshanic Valley",
      "Pine Barrens Golf Club",
    ]);
  });
});
