import { describe, expect, it } from "vitest";
import { classifyIntent, extractCourseNameFromQuestion, buildRetrievalFilters } from "./intent.ts";

describe("classifyIntent", () => {
  it("classifies course rating questions as find_courses", () => {
    expect(classifyIntent("Show me the highest-rated courses members have reviewed.")).toBe(
      "find_courses",
    );
  });

  it("classifies introduction questions as recommend_introductions", () => {
    expect(classifyIntent("Who should I meet in Florida?")).toBe("recommend_introductions");
  });

  it("classifies played-course member questions as find_members", () => {
    expect(classifyIntent("Which members have played National Golf Links?")).toBe("find_members");
  });

  it("returns unsupported for empty questions", () => {
    expect(classifyIntent("   ")).toBe("unsupported");
  });
});

describe("buildRetrievalFilters", () => {
  it("extracts Florida for flagship meet-in-location questions", () => {
    const filters = buildRetrievalFilters(
      "Who should I meet in Florida?",
      "recommend_introductions",
    );
    expect(filters.memberFilters.location?.toLowerCase()).toBe("florida");
  });
});

describe("extractCourseNameFromQuestion", () => {
  it("extracts course names from played questions", () => {
    expect(extractCourseNameFromQuestion("Which members have played National Golf Links?")).toBe(
      "National Golf Links",
    );
  });
});
