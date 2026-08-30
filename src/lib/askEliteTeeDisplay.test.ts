import { describe, expect, it } from "vitest";
import {
  buildAskReasonMaps,
  collectUniqueMatchSignals,
  getAskAnswerText,
  getAskStatusGuidance,
  getAskStatusLabel,
  memberFacingAskError,
} from "./askEliteTeeDisplay";

describe("getAskStatusLabel", () => {
  it("returns labels for non-ok statuses", () => {
    expect(getAskStatusLabel("needs_clarification")).toBe("Need a bit more detail");
    expect(getAskStatusLabel("insufficient_data")).toBe("Limited directory data");
    expect(getAskStatusLabel("rate_limited")).toBe("Daily limit reached");
    expect(getAskStatusLabel("ok")).toBeNull();
  });
});

describe("getAskAnswerText", () => {
  it("preserves backend insufficient-data copy when provided", () => {
    expect(
      getAskAnswerText(
        "insufficient_data",
        "I need a little more detail to search the network. Try naming a city, destination, course, or club.",
      ),
    ).toBe(
      "I need a little more detail to search the network. Try naming a city, destination, course, or club.",
    );
  });

  it("falls back to honest insufficient-data copy", () => {
    expect(getAskAnswerText("insufficient_data", "")).toBe(
      "I don't have enough EliteTee information yet to answer that confidently.",
    );
  });

  it("uses premium rate-limit copy without jargon", () => {
    expect(getAskAnswerText("rate_limited", "")).toBe(
      "Ask EliteTee has reached today's usage limit. Try again later.",
    );
  });

  it("preserves backend answer for ok responses", () => {
    expect(getAskAnswerText("ok", "Two members match your criteria.")).toBe(
      "Two members match your criteria.",
    );
  });

  it("uses clarification copy for needs_clarification responses", () => {
    expect(getAskAnswerText("needs_clarification", "Which course do you have in mind?")).toBe(
      "Which course do you have in mind?",
    );
  });
});

describe("getAskStatusGuidance", () => {
  it("returns concise guidance for non-ok statuses", () => {
    expect(getAskStatusGuidance("needs_clarification")?.[0]).toContain("specific");
    expect(getAskStatusGuidance("rate_limited")).toEqual(["Try again later today or tomorrow."]);
    expect(getAskStatusGuidance("disabled")).toEqual([
      "Try again later or explore Discover and Courses in the meantime.",
    ]);
    expect(getAskStatusGuidance("ok")).toBeNull();
  });
});

describe("memberFacingAskError", () => {
  it("maps rate limit errors without exposing raw text", () => {
    expect(memberFacingAskError("Daily rate limit exceeded for user")).toContain("usage limit");
  });

  it("falls back to a generic member-safe message", () => {
    expect(memberFacingAskError("FunctionsHttpError: 500 internal")).toBe(
      "Ask EliteTee could not complete your request. Please try again.",
    );
  });
});

describe("buildAskReasonMaps", () => {
  it("indexes member and course signals separately", () => {
    const { memberMap, courseMap } = buildAskReasonMaps([
      { target_type: "member", target_id: "m1", signals: ["Same region"] },
      { target_type: "course", target_id: "c1", signals: ["Shared course"] },
    ]);

    expect(memberMap.get("m1")).toEqual(["Same region"]);
    expect(courseMap.get("c1")).toEqual(["Shared course"]);
  });
});

describe("collectUniqueMatchSignals", () => {
  it("deduplicates signals across targets", () => {
    expect(
      collectUniqueMatchSignals([
        { target_type: "member", target_id: "m1", signals: ["Same region", "Shared interests"] },
        { target_type: "member", target_id: "m2", signals: ["Same region"] },
      ]),
    ).toEqual(["Same region", "Shared interests"]);
  });
});
