import { describe, expect, it } from "vitest";
import { extractCourseNameFromQuestion } from "./intent.ts";
import { resolvePlayedCourseAnswerPath } from "./played-course-answer-path.ts";

describe("resolvePlayedCourseAnswerPath — Who has played National Golf Links?", () => {
  const question = "Who has played National Golf Links?";
  const extracted = extractCourseNameFromQuestion(question);

  it("extracts the course name from the exact production question", () => {
    expect(extracted).toBe("National Golf Links");
  });

  it("play rows present → deterministic recorded-rounds path (not generic directory fallback)", () => {
    const path = resolvePlayedCourseAnswerPath({
      extractedCourseName: extracted,
      matchedCourse: {
        id: "course-ngl",
        name: "National Golf Links of America",
        slug: "national-golf-links-of-america",
      },
      playRows: [
        { user_id: "a", full_name: "Hugo Johansson", round_count: 2, avg_course_rating: 9 },
        { user_id: "b", full_name: "Keegan O'Brien", round_count: 1, avg_course_rating: 8 },
      ],
    });

    expect(path.kind).toBe("deterministic");
    if (path.kind !== "deterministic") return;
    expect(path.answer.startsWith("These EliteTee members have recorded rounds at")).toBe(true);
    expect(path.answer).toContain("National Golf Links of America");
    expect(path.answer).toContain("Hugo Johansson");
    expect(path.answer).toContain("Keegan O'Brien");
    expect(path.answer).not.toContain("closest matches from EliteTee directory data");
    expect(path.playRows).toHaveLength(2);
  });

  it("zero play rows → insufficient-data (never generic member-directory fallthrough)", () => {
    const path = resolvePlayedCourseAnswerPath({
      extractedCourseName: extracted,
      matchedCourse: {
        id: "course-ngl",
        name: "National Golf Links of America",
      },
      playRows: [],
    });
    expect(path).toEqual({ kind: "insufficient" });
  });

  it("matched course missing → insufficient-data for specific-course questions", () => {
    expect(
      resolvePlayedCourseAnswerPath({
        extractedCourseName: extracted,
        matchedCourse: null,
        playRows: [],
      }),
    ).toEqual({ kind: "insufficient" });
  });

  it("non-played questions remain not_applicable so other Ask paths stay unchanged", () => {
    expect(
      resolvePlayedCourseAnswerPath({
        extractedCourseName: null,
        matchedCourse: null,
        playRows: [],
      }),
    ).toEqual({ kind: "not_applicable" });
  });
});
