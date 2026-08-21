import { describe, expect, it } from "vitest";
import {
  normalizeCourseNameKey,
  parseExperienceFeedPostContent,
} from "./ensureExperienceRoundLink";

describe("parseExperienceFeedPostContent", () => {
  it("parses The Bridge-style experience content", () => {
    const parsed = parseExperienceFeedPostContent({
      badge: "Round Review",
      rating: 9.2,
      details: [
        { label: "Location", value: "Bridgehampton NY" },
        { label: "Played", value: "Jun 18, 2024" },
        { label: "Course Rating", value: "9.2/10.0" },
        { label: "Would play again", value: "Yes" },
      ],
      message: "The Bridge is one of the wealthiest clubs…",
      headline: "The Bridge",
      composerPostType: "round-review",
      internalPostType: "course-review",
    });

    expect(parsed).toMatchObject({
      courseName: "The Bridge",
      location: "Bridgehampton NY",
      playedOn: "2024-06-18",
      courseRating: 9.2,
      wouldPlayAgain: true,
      note: "The Bridge is one of the wealthiest clubs…",
    });
  });
});

describe("normalizeCourseNameKey", () => {
  it("normalizes course names for duplicate detection", () => {
    expect(normalizeCourseNameKey("The Bridge")).toBe("the bridge");
    expect(normalizeCourseNameKey("  THE   Bridge ")).toBe("the bridge");
  });
});
