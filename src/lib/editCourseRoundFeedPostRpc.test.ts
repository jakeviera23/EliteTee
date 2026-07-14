import { describe, expect, it } from "vitest";
import { buildEditCourseRoundFeedPostRpcParams } from "./editCourseRoundFeedPostRpc";

describe("buildEditCourseRoundFeedPostRpcParams", () => {
  it("uses the 6-parameter RPC signature when structured location is not provided", () => {
    const params = buildEditCourseRoundFeedPostRpcParams(
      "post-1",
      {
        message: "Great round",
        courseRating: 8.5,
        playedOn: "2026-06-12",
        wouldPlayAgain: true,
        location: "Pinehurst, NC",
      },
      8.5,
    );

    expect(Object.keys(params).sort()).toEqual([
      "p_course_rating",
      "p_location",
      "p_message",
      "p_played_on",
      "p_post_id",
      "p_would_play_again",
    ]);
  });

  it("includes structured location params only when city, region, and country are all set", () => {
    const params = buildEditCourseRoundFeedPostRpcParams(
      "post-1",
      {
        message: "Great round",
        courseRating: 8.5,
        playedOn: "2026-06-12",
        wouldPlayAgain: true,
        location: "Pinehurst, NC, United States",
        city: "Pinehurst",
        region: "NC",
        country: "United States",
      },
      8.5,
    );

    expect(params).toMatchObject({
      p_city: "Pinehurst",
      p_region: "NC",
      p_country: "United States",
    });
  });
});
