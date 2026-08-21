import { describe, expect, it } from "vitest";
import type { MobileMemberProfile } from "../types/member";
import {
  buildFeaturedDiscoverSections,
  buildMatchReasons,
  buildPrimaryMatchReason,
  filterDiscoverMembers,
  parseBasedInParts,
  scoreMemberRelevance,
  selectInterestChips,
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

  it("keeps travel destination reasons like New York / Long Island", () => {
    const viewer = member({
      id: "viewer",
      full_name: "Viewer",
      based_in: "Bridgehampton, New York, United States",
      regions: ["New York", "Long Island"],
    });

    const noah = member({
      id: "noah",
      full_name: "Noah Sparrow",
      traveling_to: "New York / Long Island",
      based_in: "Chicago, Illinois, United States",
    });

    expect(buildMatchReasons(viewer, noah)).toContain("Traveling to New York / Long Island");
    expect(buildPrimaryMatchReason(viewer, noah)).toBe("Traveling to New York / Long Island");
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

    expect(sections.map((section) => section.id)).toEqual(["suggested"]);
    expect(sections[0]?.members.map((entry) => entry.id)).toEqual(["1"]);
    expect(sections.every((section) => section.members.every((m) => m.user_id))).toBe(true);
    expect(sections.every((section) => section.members.length <= 6)).toBe(true);
  });

  it("dedupes members across featured sections by priority", () => {
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
          id: "priority",
          full_name: "Priority Member",
          regions: ["Florida"],
          based_in: "Miami, Florida, United States",
          traveling_to: "Scotland",
          current_request: "Looking for a game",
        }),
        member({
          id: "connect-only",
          full_name: "Connector",
          current_request: "Open to intros",
        }),
        member({
          id: "travel-only",
          full_name: "Traveler",
          traveling_to: "Japan",
        }),
      ],
      viewer,
    );

    expect(sections.map((section) => section.id)).toEqual([
      "suggested",
      "looking-to-connect",
      "traveling-soon",
    ]);
    expect(sections[0]?.members.map((entry) => entry.id)).toEqual(["priority"]);
    expect(sections[1]?.members.map((entry) => entry.id)).toEqual(["connect-only"]);
    expect(sections[2]?.members.map((entry) => entry.id)).toEqual(["travel-only"]);

    const featuredIds = sections.flatMap((section) => section.members.map((entry) => entry.id));
    expect(featuredIds).toEqual(["priority", "connect-only", "travel-only"]);
    expect(new Set(featuredIds).size).toBe(featuredIds.length);
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

    // Same member qualifies for both lower rails; priority keeps Looking to connect only.
    expect(sections.map((section) => section.id)).toEqual(["looking-to-connect"]);
    expect(sections.flatMap((section) => section.members.map((entry) => entry.id))).toEqual(["1"]);
  });
});

describe("selectInterestChips", () => {
  it("keeps concise structured interests and omits sentence-like values", () => {
    const chips = selectInterestChips(
      member({
        id: "1",
        full_name: "Chip Test",
        golf_interests: [
          "Architecture",
          "Private-club golf",
          "Looking for weekend games around Palm Beach whenever I travel",
          "I love links golf and meeting new people on the road!",
          "Architecture",
          "Bucket list",
        ],
      }),
      3,
    );

    expect(chips).toEqual(["Architecture", "Private-club golf", "Bucket list"]);
  });
});
