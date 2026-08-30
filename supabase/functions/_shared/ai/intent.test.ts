import { describe, expect, it } from "vitest";
import {
  buildCourseDirectoryFilters,
  buildRetrievalFilters,
  classifyIntent,
  extractCourseNameFromQuestion,
  extractMemberLocationFromQuestion,
  extractMemberSearchQuery,
  extractTravelDestinationFromQuestion,
  isGenericIntroductionPlaceholderQuestion,
  isIntentionallyBroadMemberQuestion,
  questionImpliesSpecificMemberCriteria,
  shouldRejectBroadMemberRetrieval,
} from "./intent.ts";

describe("classifyIntent", () => {
  it("classifies course rating questions as find_courses", () => {
    expect(classifyIntent("Show me the highest-rated courses members have reviewed.")).toBe(
      "find_courses",
    );
    expect(classifyIntent("Which courses have EliteTee members rated highest?")).toBe(
      "find_courses",
    );
  });

  it("classifies introduction questions as recommend_introductions", () => {
    expect(classifyIntent("Who should I meet in Florida?")).toBe("recommend_introductions");
    expect(classifyIntent("Who should I connect with in Palm Beach?")).toBe(
      "recommend_introductions",
    );
    expect(classifyIntent("Who around Philadelphia might be worth connecting with?")).toBe(
      "recommend_introductions",
    );
  });

  it("classifies played-course member questions as find_members", () => {
    expect(classifyIntent("Which members have played National Golf Links?")).toBe("find_members");
    expect(classifyIntent("Who has played National Golf Links?")).toBe("find_members");
    expect(classifyIntent("Who has played Sebonack?")).toBe("find_members");
  });

  it("returns unsupported for empty questions", () => {
    expect(classifyIntent("   ")).toBe("unsupported");
  });
});

describe("audit example questions — parsing", () => {
  it("1. Who should I connect with in Palm Beach?", () => {
    const question = "Who should I connect with in Palm Beach?";
    const filters = buildRetrievalFilters(question, "recommend_introductions");

    expect(extractMemberLocationFromQuestion(question)).toBe("Palm Beach");
    expect(filters.memberFilters.location).toBe("Palm Beach");
    expect(filters.memberFilters.query).toBe("");
    expect(shouldRejectBroadMemberRetrieval(question, filters.memberFilters, null)).toBe(false);
  });

  it("2. Who has played Sebonack?", () => {
    const question = "Who has played Sebonack?";
    const filters = buildRetrievalFilters(question, "find_members");

    expect(extractCourseNameFromQuestion(question)).toBe("Sebonack");
    expect(shouldRejectBroadMemberRetrieval(
      question,
      filters.memberFilters,
      extractCourseNameFromQuestion(question),
    )).toBe(false);
  });

  it("3. Who in EliteTee is traveling to Scotland?", () => {
    const question = "Who in EliteTee is traveling to Scotland?";
    const filters = buildRetrievalFilters(question, "find_members");

    expect(extractMemberLocationFromQuestion(question)).toBe("");
    expect(extractTravelDestinationFromQuestion(question)).toBe("Scotland");
    expect(filters.memberFilters.location).toBe("");
    expect(filters.memberFilters.travel).toBe("Scotland");
    expect(shouldRejectBroadMemberRetrieval(question, filters.memberFilters, null)).toBe(false);
  });

  it("4. Who can help with an introduction at a course?", () => {
    const question = "Who can help with an introduction at a course?";
    const filters = buildRetrievalFilters(question, "recommend_introductions");

    expect(extractMemberLocationFromQuestion(question)).toBe("");
    expect(extractCourseNameFromQuestion(question)).toBeNull();
    expect(filters.memberFilters.location).not.toBe("a course");
    expect(
      shouldRejectBroadMemberRetrieval(
        question,
        filters.memberFilters,
        extractCourseNameFromQuestion(question),
      ),
    ).toBe(true);
  });

  it("5. Which courses have EliteTee members rated highest?", () => {
    const question = "Which courses have EliteTee members rated highest?";
    expect(classifyIntent(question)).toBe("find_courses");
    const filters = buildRetrievalFilters(question, "find_courses");
    expect(filters.memberFilters).toEqual({});
    expect(filters.courseQuery).toBe("");
    expect(filters.courseDirectoryFilters.locationQuery).toBe("");
  });

  it("6. Who around Philadelphia might be worth connecting with?", () => {
    const question = "Who around Philadelphia might be worth connecting with?";
    const filters = buildRetrievalFilters(question, "recommend_introductions");

    expect(extractMemberLocationFromQuestion(question)).toBe("Philadelphia");
    expect(filters.memberFilters.location).toBe("Philadelphia");
    expect(shouldRejectBroadMemberRetrieval(question, filters.memberFilters, null)).toBe(false);
  });
});

describe("location parsing", () => {
  it("supports around, near, based in, and members in phrasing", () => {
    expect(extractMemberLocationFromQuestion("Who near Palm Beach should I know?")).toBe(
      "Palm Beach",
    );
    expect(extractMemberLocationFromQuestion("Who is based in New York?")).toBe("New York");
    expect(extractMemberLocationFromQuestion("Show members in Florida")).toBe("Florida");
  });

  it("does not treat EliteTee product phrases as locations", () => {
    expect(extractMemberLocationFromQuestion("Who in EliteTee plays golf?")).toBe("");
    expect(extractMemberLocationFromQuestion("Who on EliteTee is nearby?")).toBe("");
    expect(extractMemberLocationFromQuestion("Who within EliteTee travels often?")).toBe("");
    expect(extractMemberLocationFromQuestion("Who in the network should I meet?")).toBe("");
  });

  it("normalizes trailing punctuation from extracted locations", () => {
    expect(extractMemberLocationFromQuestion("Who should I meet in Palm Beach?")).toBe("Palm Beach");
  });
});

describe("travel parsing", () => {
  it("extracts destinations from common travel phrasing", () => {
    expect(extractTravelDestinationFromQuestion("Who is going to Ireland?")).toBe("Ireland");
    expect(extractTravelDestinationFromQuestion("Who is headed to Scotland?")).toBe("Scotland");
    expect(extractTravelDestinationFromQuestion("Who is heading to Scotland?")).toBe("Scotland");
    expect(extractTravelDestinationFromQuestion("Who is visiting Scotland?")).toBe("Scotland");
    expect(extractTravelDestinationFromQuestion("Who in EliteTee is traveling to Scotland?")).toBe(
      "Scotland",
    );
    expect(extractTravelDestinationFromQuestion("Who is travelling to Scotland?")).toBe("Scotland");
  });

  it("does not return travel phrasing with punctuation as the destination", () => {
    expect(extractTravelDestinationFromQuestion("Who is traveling to Scotland?")).toBe("Scotland");
    expect(extractTravelDestinationFromQuestion("Who is traveling to Scotland?")).not.toMatch(/\?/);
  });
});

describe("course + introduction parsing", () => {
  it("extracts named courses from introduction questions", () => {
    expect(extractCourseNameFromQuestion("Who can help with an introduction at Sebonack?")).toBe(
      "Sebonack",
    );
  });

  it("rejects generic course placeholders", () => {
    expect(extractCourseNameFromQuestion("Who can help with an introduction at a course?")).toBeNull();
    expect(extractCourseNameFromQuestion("Who can help with an introduction at the course?")).toBeNull();
  });

  it("keeps played-course extraction working", () => {
    expect(extractCourseNameFromQuestion("Which members have played National Golf Links?")).toBe(
      "National Golf Links",
    );
    expect(extractCourseNameFromQuestion("Who has played National Golf Links?")).toBe(
      "National Golf Links",
    );
  });
});

describe("course ranking queries", () => {
  it("uses an unfiltered course query for global ranking questions", () => {
    const questions = [
      "Which courses have EliteTee members rated highest?",
      "What are the highest rated courses?",
      "Show me the best rated courses",
      "Which courses do members recommend most?",
    ];

    for (const question of questions) {
      const filters = buildRetrievalFilters(question, "find_courses");
      expect(filters.courseQuery).toBe("");
      expect(filters.courseDirectoryFilters.locationQuery).toBe("");
    }
  });
});

describe("generic introduction placeholders", () => {
  it("detects generic introduction-at-course questions", () => {
    expect(isGenericIntroductionPlaceholderQuestion("Who can help with an introduction at a course?")).toBe(
      true,
    );
    expect(isGenericIntroductionPlaceholderQuestion("Who can help with an introduction at Sebonack?")).toBe(
      false,
    );
  });
});

describe("member retrieval guard", () => {
  it("allows intentionally broad discovery questions", () => {
    const question = "Who should I connect with?";
    const filters = buildRetrievalFilters(question, "recommend_introductions");

    expect(isIntentionallyBroadMemberQuestion(question)).toBe(true);
    expect(questionImpliesSpecificMemberCriteria(question)).toBe(false);
    expect(shouldRejectBroadMemberRetrieval(question, filters.memberFilters, null)).toBe(false);
  });

  it("rejects specific questions that failed to parse meaningful filters", () => {
    const question = "Who can help with an introduction at a course?";
    const filters = buildRetrievalFilters(question, "recommend_introductions");

    expect(isGenericIntroductionPlaceholderQuestion(question)).toBe(true);
    expect(isIntentionallyBroadMemberQuestion(question)).toBe(false);
    expect(questionImpliesSpecificMemberCriteria(question)).toBe(true);
    expect(
      shouldRejectBroadMemberRetrieval(
        question,
        filters.memberFilters,
        extractCourseNameFromQuestion(question),
      ),
    ).toBe(true);
  });

  it("allows named-course introduction questions through the course bridge", () => {
    const question = "Who can help with an introduction at Sebonack?";
    const filters = buildRetrievalFilters(question, "recommend_introductions");
    const courseName = extractCourseNameFromQuestion(question);

    expect(courseName).toBe("Sebonack");
    expect(shouldRejectBroadMemberRetrieval(question, filters.memberFilters, courseName)).toBe(
      false,
    );
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
