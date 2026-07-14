import { describe, expect, it } from "vitest";
import {
  FEED_COMPOSER_MIN_MESSAGE_LENGTH,
  getFeedComposerMessageLength,
  getFeedComposerValidation,
} from "./feedComposerValidation";

describe("getFeedComposerMessageLength", () => {
  it("counts trimmed characters", () => {
    expect(getFeedComposerMessageLength("  hello  ")).toBe(5);
  });
});

describe("getFeedComposerValidation", () => {
  it("blocks short messages with a character requirement helper", () => {
    const result = getFeedComposerValidation({
      message: "Too short",
      requiresPrimaryField: false,
      requiresRating: false,
    });

    expect(result.canSubmit).toBe(false);
    expect(result.messageLength).toBe(9);
    expect(result.blockerMessage).toBe(
      `Enter at least ${FEED_COMPOSER_MIN_MESSAGE_LENGTH} characters to post.`,
    );
    expect(result.characterCounterLabel).toBe("9 / 20 characters");
  });

  it("allows messages that meet the minimum length", () => {
    const result = getFeedComposerValidation({
      message: "This message is long enough to post.",
      requiresPrimaryField: false,
      requiresRating: false,
    });

    expect(result.canSubmit).toBe(true);
    expect(result.blockerMessage).toBeNull();
  });

  it("requires a primary field after the message passes", () => {
    const result = getFeedComposerValidation({
      message: "Looking for a member introduction this week.",
      primaryFieldValue: "",
      primaryFieldLabel: "Club / Course",
      requiresPrimaryField: true,
      requiresRating: false,
    });

    expect(result.canSubmit).toBe(false);
    expect(result.blockerMessage).toBe("Add club / course to post.");
  });

  it("requires a valid rating for round reviews", () => {
    const result = getFeedComposerValidation({
      message: "Great round today with perfect conditions.",
      primaryFieldValue: "Pine Valley",
      primaryFieldLabel: "Course",
      requiresPrimaryField: true,
      ratingValue: "10.5",
      requiresRating: true,
    });

    expect(result.canSubmit).toBe(false);
    expect(result.blockerMessage).toBe("Select a course rating to post.");
  });
});
