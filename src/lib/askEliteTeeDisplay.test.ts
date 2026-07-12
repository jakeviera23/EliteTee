import { describe, expect, it } from "vitest";
import {
  buildAskReasonMaps,
  collectUniqueMatchSignals,
  getAskAnswerText,
  getAskStatusLabel,
  memberFacingAskError,
} from "./askEliteTeeDisplay";

describe("getAskStatusLabel", () => {
  it("returns labels for non-ok statuses", () => {
    expect(getAskStatusLabel("insufficient_data")).toBe("Limited directory data");
    expect(getAskStatusLabel("rate_limited")).toBe("Daily limit reached");
    expect(getAskStatusLabel("ok")).toBeNull();
  });
});

describe("getAskAnswerText", () => {
  it("uses the honest insufficient-data copy", () => {
    expect(getAskAnswerText("insufficient_data", "Backend fallback")).toBe(
      "I don't have enough EliteTee information yet to answer that confidently.",
    );
  });

  it("preserves backend answer for ok responses", () => {
    expect(getAskAnswerText("ok", "Two members match your criteria.")).toBe(
      "Two members match your criteria.",
    );
  });
});

describe("memberFacingAskError", () => {
  it("maps rate limit errors without exposing raw text", () => {
    expect(memberFacingAskError("Daily rate limit exceeded for user")).toContain("limit");
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
