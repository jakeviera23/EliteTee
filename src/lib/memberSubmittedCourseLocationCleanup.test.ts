import { describe, expect, it } from "vitest";
import {
  hasCorrectMemberSubmittedStructuredLocation,
  isCityEqualOrSimilarToCourseName,
  resolveMemberSubmittedLocationCleanup,
} from "./courseLocationParse";
import {
  isEligibleForMemberSubmittedLocationCleanup,
  shouldRejectProviderCourseLocationEdit,
} from "./memberSubmittedCourseLocation";

describe("resolveMemberSubmittedLocationCleanup", () => {
  it("auto-corrects Southampton NY embedded in city", () => {
    expect(
      resolveMemberSubmittedLocationCleanup({
        name: "Sebonack Golf Club",
        city: "Southampton NY",
        region: null,
        country: null,
      }),
    ).toMatchObject({
      action: "auto_update",
      suggestedCity: "Southampton",
      suggestedRegion: "NY",
      suggestedCountry: "United States",
      parseSource: "golf_courses.city",
      parseConfidence: "high",
    });
  });

  it("auto-corrects Juno Beach Florida embedded in city", () => {
    expect(
      resolveMemberSubmittedLocationCleanup({
        name: "Seminole Golf Club",
        city: "Juno Beach Florida",
        region: null,
        country: null,
      }),
    ).toMatchObject({
      action: "auto_update",
      suggestedCity: "Juno Beach",
      suggestedRegion: "Florida",
      suggestedCountry: "United States",
    });
  });

  it("auto-corrects Manakin Sabot VA embedded in city", () => {
    expect(
      resolveMemberSubmittedLocationCleanup({
        name: "Kinloch Golf Club",
        city: "Manakin Sabot VA",
        region: null,
        country: null,
      }),
    ).toMatchObject({
      action: "auto_update",
      suggestedCity: "Manakin Sabot",
      suggestedRegion: "VA",
      suggestedCountry: "United States",
    });
  });

  it("auto-corrects Westhampton Beach NY embedded in city", () => {
    expect(
      resolveMemberSubmittedLocationCleanup({
        name: "Westhampton Golf Club",
        city: "Westhampton Beach NY",
        region: null,
        country: null,
      }),
    ).toMatchObject({
      action: "auto_update",
      suggestedCity: "Westhampton Beach",
      suggestedRegion: "NY",
      suggestedCountry: "United States",
      parseSource: "golf_courses.city",
    });
  });

  it("uses experience location for course-name-as-city rows", () => {
    expect(
      resolveMemberSubmittedLocationCleanup({
        name: "Southampton Golf Club",
        city: "Southampton Golf Club",
        region: null,
        country: null,
        latestRoundLocation: "Southampton NY",
      }),
    ).toMatchObject({
      action: "auto_update",
      suggestedCity: "Southampton",
      suggestedRegion: "NY",
      suggestedCountry: "United States",
      parseSource: "round_location",
    });
  });

  it("marks ambiguous course-name-as-city rows for manual review", () => {
    expect(
      resolveMemberSubmittedLocationCleanup({
        name: "Southampton Golf Club",
        city: "Southampton Golf Club",
        region: null,
        country: null,
        latestRoundLocation: "Hidden Valley",
      }),
    ).toMatchObject({
      action: "manual_review",
      reasonManualReview:
        "City matches or resembles course name without a confidently parseable experience location.",
    });
  });

  it("skips already-correct structured locations", () => {
    expect(
      resolveMemberSubmittedLocationCleanup({
        name: "National Golf Links of America",
        city: "Southampton",
        region: "New York",
        country: "United States",
      }),
    ).toMatchObject({ action: "skip" });

    expect(
      hasCorrectMemberSubmittedStructuredLocation({
        name: "National Golf Links of America",
        city: "Southampton",
        region: "New York",
        country: "United States",
      }),
    ).toBe(true);
  });

  it("remains idempotent after a successful cleanup shape", () => {
    const corrected = resolveMemberSubmittedLocationCleanup({
      name: "Sebonack Golf Club",
      city: "Southampton",
      region: "NY",
      country: "United States",
    });

    expect(corrected.action).toBe("skip");
  });
});

describe("member-submitted cleanup eligibility", () => {
  it("allows only member-submitted courses", () => {
    expect(
      isEligibleForMemberSubmittedLocationCleanup({
        submitted_by_member: true,
        source_name: "member_submitted",
      }),
    ).toBe(true);

    expect(
      isEligibleForMemberSubmittedLocationCleanup({
        submitted_by_member: false,
        source_name: "elitetee_seed",
      }),
    ).toBe(false);

    expect(
      shouldRejectProviderCourseLocationEdit({
        submitted_by_member: false,
        source_name: "elitetee_seed",
      }),
    ).toBe(true);
  });
});

describe("isCityEqualOrSimilarToCourseName", () => {
  it("detects exact and golf-club-like city/name matches", () => {
    expect(isCityEqualOrSimilarToCourseName("Southampton Golf Club", "Southampton Golf Club")).toBe(
      true,
    );
    expect(isCityEqualOrSimilarToCourseName("Shinnecock Hills Golf Club", "Shinnecock Hills")).toBe(
      true,
    );
    expect(isCityEqualOrSimilarToCourseName("Seminole Golf Club", "Juno Beach Florida")).toBe(
      false,
    );
  });
});
