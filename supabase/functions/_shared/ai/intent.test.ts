import { describe, expect, it } from "vitest";
import {
  classifyIntent,
  extractCourseNameFromQuestion,
  extractMemberSearchQuery,
  extractPlaceMention,
  extractTravelDestination,
  buildRetrievalFilters,
  buildCourseDirectoryFilters,
  isTopRatedCourseQuery,
} from "./intent.ts";

describe("classifyIntent", () => {
  it("classifies course rating questions as find_courses", () => {
    expect(classifyIntent("Show me the highest-rated courses members have reviewed.")).toBe(
      "find_courses",
    );
  });

  it("classifies introduction questions as recommend_introductions", () => {
    expect(classifyIntent("Who should I meet in Florida?")).toBe("recommend_introductions");
    expect(classifyIntent("Who should I connect with in New York?")).toBe("recommend_introductions");
  });

  it("classifies played-course member questions as find_members", () => {
    expect(classifyIntent("Which members have played National Golf Links?")).toBe("find_members");
    expect(classifyIntent("Who has played National Golf Links?")).toBe("find_members");
  });

  it("returns unsupported for empty questions", () => {
    expect(classifyIntent("   ")).toBe("unsupported");
  });
});

describe("isTopRatedCourseQuery", () => {
  it("recognizes best/top/highest-rated course questions", () => {
    expect(isTopRatedCourseQuery("What are the best courses members have reviewed?")).toBe(true);
    expect(isTopRatedCourseQuery("Show me the highest-rated courses")).toBe(true);
    expect(isTopRatedCourseQuery("Who should I meet in Florida?")).toBe(false);
  });
});

describe("extractPlaceMention", () => {
  it("extracts in / to / near places without capturing the rest of the question", () => {
    expect(extractPlaceMention("Who should I connect with in New York?")).toBe("New York");
    expect(extractPlaceMention("I'm traveling to Florida. Who should I connect with?")).toBe(
      "Florida",
    );
    expect(extractPlaceMention("Find members near Miami")).toBe("Miami");
  });
});

describe("extractTravelDestination", () => {
  it("returns a clean place for traveling-to questions", () => {
    expect(extractTravelDestination("I'm traveling to Florida. Who should I connect with?")).toBe(
      "Florida",
    );
    expect(extractTravelDestination("Who should I connect with in New York?")).toBe("");
  });

  it("never returns the raw remainder after travel", () => {
    const destination = extractTravelDestination(
      "I'm traveling to Florida. Who should I connect with?",
    );
    expect(destination.toLowerCase()).not.toContain("who");
    expect(destination.toLowerCase()).not.toContain("connect");
  });
});

describe("buildRetrievalFilters", () => {
  it("extracts Florida for flagship meet-in-location questions", () => {
    const filters = buildRetrievalFilters(
      "Who should I meet in Florida?",
      "recommend_introductions",
    );
    expect(filters.memberFilters.location?.toLowerCase()).toBe("florida");
    expect(filters.memberFilters.query).toBe("");
  });

  it("extracts New York for connect-with questions", () => {
    const filters = buildRetrievalFilters(
      "Who should I connect with in New York?",
      "recommend_introductions",
    );
    expect(filters.memberFilters.location).toBe("New York");
    expect(filters.memberFilters.travel).toBe("");
    expect(filters.memberFilters.query).toBe("");
  });

  it("uses Florida as destination geography without AND travel filter", () => {
    const filters = buildRetrievalFilters(
      "I'm traveling to Florida. Who should I connect with?",
      "recommend_introductions",
    );
    expect(filters.memberFilters.location).toBe("Florida");
    expect(filters.memberFilters.travel).toBe("");
    expect(filters.memberFilters.query).toBe("");
  });

  it("does not pass the full question as the member query filter", () => {
    expect(buildRetrievalFilters("Show all members", "find_members").memberFilters.query).toBe("");
    expect(buildRetrievalFilters("Find Ryan Konrad", "find_members").memberFilters.query).toBe(
      "Ryan Konrad",
    );
  });

  it("uses New York for Show me courses in New York", () => {
    const filters = buildRetrievalFilters("Show me courses in New York", "find_courses");
    expect(filters.courseQuery).toBe("New York");
    expect(filters.courseDirectoryFilters.locationQuery).toBe("New York");
  });

  it("uses New Jersey for What courses are in New Jersey?", () => {
    const filters = buildRetrievalFilters("What courses are in New Jersey?", "find_courses");
    expect(filters.courseQuery).toBe("New Jersey");
  });

  it("treats best-reviewed courses as top-rated with no fake location", () => {
    const filters = buildRetrievalFilters(
      "What are the best courses members have reviewed?",
      "find_courses",
    );
    expect(filters.courseQuery).toBe("");
    expect(filters.courseDirectoryFilters.locationQuery).toBe("");
    expect(filters.courseDirectoryFilters.rankByReviews).toBe(true);
  });
});

describe("regression: production V1 failure questions", () => {
  it("traveling to Florida parses destination-only geography", () => {
    const q = "I'm traveling to Florida. Who should I connect with?";
    expect(classifyIntent(q)).toBe("recommend_introductions");
    const filters = buildRetrievalFilters(q, "recommend_introductions");
    expect(filters.memberFilters.location).toBe("Florida");
    expect(filters.memberFilters.travel).toBe("");
  });

  it("New York connect question keeps working", () => {
    const q = "Who should I connect with in New York?";
    expect(classifyIntent(q)).toBe("recommend_introductions");
    const filters = buildRetrievalFilters(q, "recommend_introductions");
    expect(filters.memberFilters.location).toBe("New York");
    expect(filters.memberFilters.travel).toBe("");
  });

  it("best courses members have reviewed has empty location and rankByReviews", () => {
    const q = "What are the best courses members have reviewed?";
    expect(classifyIntent(q)).toBe("find_courses");
    const filters = buildRetrievalFilters(q, "find_courses");
    expect(filters.courseDirectoryFilters.locationQuery).toBe("");
    expect(filters.courseDirectoryFilters.rankByReviews).toBe(true);
    expect(filters.courseQuery).toBe("");
  });

  it("who has played National Golf Links extracts the course name", () => {
    const q = "Who has played National Golf Links?";
    expect(classifyIntent(q)).toBe("find_members");
    expect(extractCourseNameFromQuestion(q)).toBe("National Golf Links");
  });
});

describe("buildCourseDirectoryFilters", () => {
  it("extracts access and course type modifiers", () => {
    const filters = buildCourseDirectoryFilters("Find private courses in Florida");
    expect(filters.locationQuery).toBe("Florida");
    expect(filters.accessType).toBe("private");
    expect(filters.courseType).toBeNull();
  });

  it("extracts links and public modifiers for Scotland", () => {
    const filters = buildCourseDirectoryFilters("Show public links courses in Scotland");
    expect(filters.locationQuery).toBe("Scotland");
    expect(filters.accessType).toBe("public");
    expect(filters.courseType).toBe("links");
  });
});

describe("extractMemberSearchQuery", () => {
  it("returns empty for broad member list questions", () => {
    expect(extractMemberSearchQuery("Show all members")).toBe("");
  });

  it("extracts names from find questions", () => {
    expect(extractMemberSearchQuery("Find Ryan Konrad")).toBe("Ryan Konrad");
  });
});

describe("extractCourseNameFromQuestion", () => {
  it("extracts course names from played questions", () => {
    expect(extractCourseNameFromQuestion("Which members have played National Golf Links?")).toBe(
      "National Golf Links",
    );
    expect(extractCourseNameFromQuestion("Who has played National Golf Links?")).toBe(
      "National Golf Links",
    );
  });

  it("does not treat played-in-region phrases as course names", () => {
    expect(extractCourseNameFromQuestion("What courses have members played in the Hamptons?")).toBeNull();
  });
});
