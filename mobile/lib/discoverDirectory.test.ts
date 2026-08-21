import { describe, expect, it } from "vitest";
import type { MobileMemberProfile } from "../types/member";
import {
  buildFeaturedDiscoverSections,
  buildMatchReasons,
  buildPrimaryMatchReason,
  filterDiscoverMembers,
  parseBasedInParts,
  scoreMemberRelevance,
} from "./discoverDirectory";

function member(
  overrides: Partial<MobileMemberProfile> & Pick<MobileMemberProfile, "id" | "full_name">,
): MobileMemberProfile {
  return {
    email: "",
    primary_club: "",
    additional_clubs: [],
    based_in: "",
    regions: [],
    industry: "",
    golf_interests: [],
    business_interests: [],
    current_request: "",
    traveling_to: "",
    handicap: "",
    bucket_list_course_ids: [],
    club_logo_url: null,
    cover_photo_url: null,
    membership_status: "",
    is_verified: false,
    founding_member_number: null,
    portal_access_enabled: true,
    user_id: overrides.id,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("parseBasedInParts", () => {
  it("parses city, region, and country from based_in", () => {
    expect(parseBasedInParts("Palm Beach, Florida, United States")).toEqual({
      city: "Palm Beach",
      region: "Florida",
      country: "United States",
    });
  });
});

describe("filterDiscoverMembers", () => {
  it("filters by club, location, and golf interest and drops members without user_id", () => {
    const members = [
      member({
        id: "1",
        full_name: "A",
        primary_club: "Fishers Island",
        based_in: "Miami, Florida, United States",
        regions: ["Florida"],
        golf_interests: ["Architecture"],
      }),
      member({
        id: "2",
        full_name: "B",
        primary_club: "Other Club",
        golf_interests: ["Travel"],
      }),
      member({
        id: "orphan",
        full_name: "No Id",
        user_id: null,
        primary_club: "Fishers Island",
        golf_interests: ["Architecture"],
      }),
    ];

    const filtered = filterDiscoverMembers(members, {
      query: "",
      club: "Fishers Island",
      location: "Florida",
      golfInterest: "Architecture",
    });

    expect(filtered.map((entry) => entry.id)).toEqual(["1"]);
  });

  it("matches expanded search fields including travel and request", () => {
    const members = [
      member({
        id: "1",
        full_name: "Traveler",
        traveling_to: "Scotland",
        current_request: "Looking for a Highland game",
      }),
      member({ id: "2", full_name: "Local" }),
    ];

    const filtered = filterDiscoverMembers(members, {
      query: "highland",
      club: "",
      location: "",
      golfInterest: "",
    });

    expect(filtered.map((entry) => entry.id)).toEqual(["1"]);
  });
});

describe("scoreMemberRelevance", () => {
  it("scores overlap from shared profile fields and excludes self", () => {
    const viewer = member({
      id: "viewer",
      full_name: "Viewer",
      regions: ["Florida"],
      golf_interests: ["Architecture"],
      based_in: "Miami, Florida, United States",
    });

    const match = member({
      id: "match",
      full_name: "Match",
      regions: ["Florida"],
      golf_interests: ["Architecture"],
      based_in: "Miami, Florida, United States",
    });

    expect(scoreMemberRelevance(viewer, match)).toBeGreaterThan(5);
    expect(scoreMemberRelevance(viewer, viewer)).toBe(0);
    expect(scoreMemberRelevance(viewer, member({ id: "x", full_name: "X", user_id: null }))).toBe(
      0,
    );
  });
});

describe("buildMatchReasons", () => {
  it("returns concise deterministic chips supported by profile data", () => {
    const viewer = member({
      id: "viewer",
      full_name: "Viewer",
      regions: ["Florida"],
      golf_interests: ["Private-club golf"],
      based_in: "Miami, Florida, United States",
    });

    const match = member({
      id: "match",
      full_name: "Match",
      regions: ["Florida"],
      golf_interests: ["Private-club golf"],
      traveling_to: "New York",
      current_request: "Looking for a game next month",
      based_in: "Palm Beach, Florida, United States",
    });

    expect(buildMatchReasons(viewer, match)).toEqual([
      "Also in Florida",
      "Private-club golf",
      "Traveling to New York",
      "Looking for connections",
    ]);
    expect(buildPrimaryMatchReason(viewer, match)).toBe("Also in Florida");
  });
});

describe("buildFeaturedDiscoverSections", () => {
  it("builds only suggested, looking-to-connect, and traveling-soon when data exists", () => {
    const viewer = member({
      id: "viewer",
      full_name: "Viewer",
      regions: ["Florida"],
      based_in: "Miami, Florida, United States",
    });

    const sections = buildFeaturedDiscoverSections(
      [
        viewer,
        member({
          id: "1",
          full_name: "Suggested",
          regions: ["Florida"],
          based_in: "Miami, Florida, United States",
          traveling_to: "Scotland",
          current_request: "Looking for a game",
        }),
        member({
          id: "orphan",
          full_name: "Dead end",
          user_id: null,
          traveling_to: "Spain",
          current_request: "Hello",
        }),
      ],
      viewer,
    );

    expect(sections.map((section) => section.id)).toEqual([
      "suggested",
      "looking-to-connect",
      "traveling-soon",
    ]);
    expect(sections.every((section) => section.members.every((m) => m.user_id))).toBe(true);
    expect(sections.every((section) => section.members.length <= 6)).toBe(true);
  });

  it("omits suggested when no score > 0 matches exist", () => {
    const viewer = member({ id: "viewer", full_name: "Viewer", based_in: "Tokyo, Japan" });
    const sections = buildFeaturedDiscoverSections(
      [
        viewer,
        member({
          id: "1",
          full_name: "Traveler",
          traveling_to: "Scotland",
          current_request: "Looking for a game",
        }),
      ],
      viewer,
    );

    expect(sections.map((section) => section.id)).toEqual([
      "looking-to-connect",
      "traveling-soon",
    ]);
  });
});
