import { describe, expect, it } from "vitest";
import type { MemberProfileRecord } from "../types/memberProfileRecord";
import {
  buildFeaturedDiscoverSections,
  buildConciseFeaturedDiscoverSections,
  buildMatchReasons,
  excludeCurrentDiscoverMember,
  extractDiscoverFilterOptions,
  filterDiscoverMembers,
  formatMemberCardContext,
  getMemberPrimaryClub,
  parseBasedInParts,
  scoreMemberRelevance,
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

describe("extractDiscoverFilterOptions", () => {
  it("derives normalized filters without exposing legacy prose", () => {
    const options = extractDiscoverFilterOptions([
      member({
        id: "1",
        full_name: "Member",
        industry: "I work in private equity and investments",
        current_request: "Email private@example.com",
        primary_club: "Liberty National, Essex County CC,",
        additional_clubs: ["Pine Valley"],
        based_in: "Palm Beach, FL, USA",
        golf_interests: ["Discovering golf course architecture and meeting like-minded golfers"],
      }),
    ]);

    expect(options.industries).toEqual(["Finance & Investing"]);
    expect(options.currentRequests).toEqual([]);
    expect(options.clubs).toEqual(["Essex County CC", "Liberty National", "Pine Valley"]);
    expect(options.regions).toEqual(["Florida"]);
    expect(options.countries).toEqual(["United States"]);
    expect(options.golfInterests).toEqual([
      "Course discovery",
      "Golf architecture",
      "Member introductions",
    ]);
  });
});

describe("excludeCurrentDiscoverMember", () => {
  it("removes the viewer by both profile and auth identity", () => {
    const viewer = member({ id: "viewer-profile", user_id: "viewer-user", full_name: "Viewer" });
    const visible = excludeCurrentDiscoverMember(
      [
        viewer,
        member({ id: "legacy-duplicate", user_id: "viewer-user", full_name: "Duplicate" }),
        member({ id: "other", user_id: "other-user", full_name: "Other" }),
      ],
      viewer,
    );
    expect(visible.map((entry) => entry.id)).toEqual(["other"]);
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
      "Same region · Florida",
      "Shared interest · Golf architecture",
      "Traveling to Scotland",
    ]);
  });
});

describe("getMemberPrimaryClub", () => {
  it("uses only the first explicit primary club and ignores additional clubs", () => {
    expect(
      getMemberPrimaryClub(
        member({
          id: "1",
          full_name: "A",
          primary_club: "Liberty National, Atlantic Golf Club",
          additional_clubs: ["Pine Valley"],
        }),
      ),
    ).toBe("Liberty National");

    expect(
      getMemberPrimaryClub(
        member({
          id: "2",
          full_name: "B",
          primary_club: "",
          additional_clubs: ["Atlantic Golf Club"],
        }),
      ),
    ).toBe("");
  });
});

describe("formatMemberCardContext", () => {
  it("returns member-facing context without system phrasing", () => {
    const viewer = member({
      id: "viewer",
      full_name: "Viewer",
      golf_interests: ["Interested in member introductions"],
    });
    const match = member({
      id: "match",
      full_name: "Match",
      golf_interests: ["Looking to connect with members"],
      traveling_to: "New York · August",
    });

    expect(formatMemberCardContext(viewer, match)).toBe("Traveling to New York · August");
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
      "new-members",
      "traveling-soon",
      "looking-to-connect",
      "founding-members",
    ]);
  });
});

describe("buildConciseFeaturedDiscoverSections", () => {
  it("shows at most two sections and never repeats a member", () => {
    const viewer = member({ id: "viewer", full_name: "Viewer", regions: ["Florida"] });
    const members = [
      viewer,
      member({
        id: "one",
        full_name: "One",
        regions: ["Florida"],
        traveling_to: "Scotland",
        current_request: "Looking for a round",
      }),
      member({ id: "two", full_name: "Two", traveling_to: "Ireland" }),
      member({ id: "three", full_name: "Three", current_request: "Architecture connections" }),
      member({ id: "four", full_name: "Four", founding_member_number: "FM-004" }),
    ];

    const sections = buildConciseFeaturedDiscoverSections(members, viewer);
    const ids = sections.flatMap((section) => section.members.map((entry) => entry.id));

    expect(sections.length).toBeLessThanOrEqual(2);
    expect(ids.length).toBeLessThanOrEqual(3);
    expect(new Set(ids).size).toBe(ids.length);
    expect(sections.every((section) => section.members.length <= 3)).toBe(true);
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
