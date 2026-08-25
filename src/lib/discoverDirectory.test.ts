import { describe, expect, it } from "vitest";
import type { MemberProfileRecord } from "../types/memberProfileRecord";
import {
  buildFeaturedDiscoverSections,
  buildMatchReasons,
  filterDiscoverMembers,
  parseBasedInParts,
  scoreMemberRelevance,
  selectInterestChips,
  sortDiscoverMembers,
} from "./discoverDirectory";

function member(
  overrides: Partial<MemberProfileRecord> & Pick<MemberProfileRecord, "id" | "full_name">,
): MemberProfileRecord {
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
  it("filters by club and golf interest", () => {
    const members = [
      member({
        id: "1",
        full_name: "A",
        primary_club: "Fishers Island",
        golf_interests: ["Architecture"],
      }),
      member({
        id: "2",
        full_name: "B",
        primary_club: "Other Club",
        golf_interests: ["Travel"],
      }),
    ];

    const filtered = filterDiscoverMembers(members, {
      query: "",
      location: "",
      club: "Fishers Island",
      city: "",
      region: "",
      country: "",
      industry: "",
      golfInterest: "Architecture",
      businessInterest: "",
      travelDestination: "",
      currentRequest: "",
    });

    expect(filtered.map((entry) => entry.id)).toEqual(["1"]);
  });
});

describe("scoreMemberRelevance", () => {
  it("scores overlap from shared profile fields", () => {
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
  });
});

describe("buildMatchReasons", () => {
  it("returns concise deterministic reasons", () => {
    const viewer = member({
      id: "viewer",
      full_name: "Viewer",
      regions: ["Florida"],
      golf_interests: ["Architecture"],
    });

    const match = member({
      id: "match",
      full_name: "Match",
      regions: ["Florida"],
      golf_interests: ["Architecture"],
      traveling_to: "Scotland",
    });

    expect(buildMatchReasons(viewer, match)).toEqual([
      "Same region: Florida",
      "Architecture interest",
      "Traveling to Scotland",
    ]);
  });
});

describe("buildFeaturedDiscoverSections", () => {
  it("builds only sections with real data", () => {
    const viewer = member({ id: "viewer", full_name: "Viewer", regions: ["Florida"] });
    const sections = buildFeaturedDiscoverSections(
      [
        viewer,
        member({
          id: "1",
          full_name: "Traveler",
          traveling_to: "Scotland",
          current_request: "Looking for a game",
          founding_member_number: "001",
        }),
      ],
      viewer,
    );

    expect(sections.map((section) => section.id)).toEqual([
      "traveling-soon",
      "new-members",
    ]);
  });

  it("limits new members and skips empty travel sections", () => {
    const viewer = member({ id: "viewer", full_name: "Viewer" });
    const members = [
      viewer,
      ...Array.from({ length: 8 }, (_, index) =>
        member({
          id: `m${index}`,
          full_name: `Member ${index}`,
          created_at: `2026-08-${String(20 - index).padStart(2, "0")}T12:00:00.000Z`,
        }),
      ),
    ];

    const sections = buildFeaturedDiscoverSections(members, viewer);
    const newMembers = sections.find((section) => section.id === "new-members");

    expect(sections.some((section) => section.id === "traveling-soon")).toBe(false);
    expect(newMembers?.members).toHaveLength(4);
  });
});

describe("selectInterestChips", () => {
  it("keeps only short structured interests", () => {
    const chips = selectInterestChips(
      member({
        id: "1",
        full_name: "Golfer",
        golf_interests: [
          "Links",
          "I am looking for a long-term golf travel partner across Europe",
          "Match play",
          "Networking: please reach out anytime",
        ],
        business_interests: ["Private equity", "A whole sentence about business strategy and goals"],
      }),
      2,
    );

    expect(chips).toEqual(["Links", "Match play"]);
  });
});

describe("sortDiscoverMembers", () => {
  it("sorts alphabetically", () => {
    const sorted = sortDiscoverMembers(
      [
        member({ id: "2", full_name: "Zed" }),
        member({ id: "1", full_name: "Amy" }),
      ],
      "alphabetical",
    );

    expect(sorted.map((entry) => entry.full_name)).toEqual(["Amy", "Zed"]);
  });
});
