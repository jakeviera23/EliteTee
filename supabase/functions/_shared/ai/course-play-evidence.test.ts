import { describe, expect, it } from "vitest";
import {
  buildCoursePlayEvidenceByMember,
  buildPlayedCourseMembersAnswer,
} from "./course-play-evidence.ts";
import type { RoundSummary } from "./types.ts";

function round(overrides: Partial<RoundSummary>): RoundSummary {
  return {
    user_id: "user-1",
    golf_course_id: "course-1",
    course_name: "National Golf Links",
    course_slug: "national-golf-links",
    location: "Southampton, NY",
    played_on: "2026-06-01",
    course_rating: 9,
    would_play_again: true,
    ...overrides,
  };
}

describe("buildCoursePlayEvidenceByMember", () => {
  it("aggregates round counts and average ratings without notes", () => {
    const evidence = buildCoursePlayEvidenceByMember({
      rounds: [
        round({ course_rating: 9 }),
        round({ course_rating: 8 }),
        round({
          user_id: "user-1",
          golf_course_id: "course-2",
          course_name: "Shinnecock Hills",
          course_slug: "shinnecock-hills",
          course_rating: 10,
        }),
      ],
    });

    expect(evidence["user-1"]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          course_name: "National Golf Links",
          round_count: 2,
          avg_rating: 8.5,
        }),
        expect.objectContaining({
          course_name: "Shinnecock Hills",
          round_count: 1,
          avg_rating: 10,
        }),
      ]),
    );
  });

  it("prioritizes focus course evidence from ai_members_by_course", () => {
    const evidence = buildCoursePlayEvidenceByMember({
      rounds: [],
      focusCourseName: "National Golf Links",
      focusCourseSlug: "national-golf-links",
      focusCourseMembers: [
        { user_id: "user-2", round_count: 3, avg_course_rating: 9.2 },
      ],
    });

    expect(evidence["user-2"]).toEqual([
      {
        course_name: "National Golf Links",
        course_slug: "national-golf-links",
        round_count: 3,
        avg_rating: 9.2,
      },
    ]);
  });

  it("Who has played National Golf Links? with play rows → deterministic answer", () => {
    const answer = buildPlayedCourseMembersAnswer({
      courseName: "National Golf Links",
      members: [],
      playRows: [
        { user_id: "a", full_name: "Hugo Johansson", round_count: 2, avg_course_rating: "9" },
        { user_id: "b", full_name: "Keegan O'Brien", round_count: 1, avg_course_rating: 8 },
      ],
    });

    expect(answer).toContain("These EliteTee members have recorded rounds at National Golf Links");
    expect(answer).toContain("Hugo Johansson");
    expect(answer).toContain("Keegan O'Brien");
    expect(answer).toContain("2 recorded rounds");
    expect(answer).toContain("avg rating 9");
    expect(answer).not.toMatch(/do not have enough|insufficient/i);
  });

  it("no play evidence → empty answer so insufficient-data remains appropriate", () => {
    expect(
      buildPlayedCourseMembersAnswer({
        courseName: "National Golf Links",
        members: [{ user_id: "x", full_name: "Nobody" }],
        evidenceByMember: {},
        playRows: [],
      }),
    ).toBe("");
  });

  it("builds a deterministic played-course answer from structured evidence map", () => {
    const evidence = buildCoursePlayEvidenceByMember({
      rounds: [],
      focusCourseName: "National Golf Links",
      focusCourseSlug: "national-golf-links",
      focusCourseMembers: [
        { user_id: "user-a", round_count: 2, avg_course_rating: 9 },
        { user_id: "user-b", round_count: 1, avg_course_rating: 8 },
      ],
    });

    const answer = buildPlayedCourseMembersAnswer({
      courseName: "National Golf Links",
      members: [
        { user_id: "user-a", full_name: "Alex Member" },
        { user_id: "user-b", full_name: "Blake Member" },
      ],
      evidenceByMember: evidence,
    });

    expect(answer).toContain("These EliteTee members have recorded rounds at National Golf Links");
    expect(answer).toContain("Alex Member");
    expect(answer).toContain("2 recorded rounds");
    expect(answer).toContain("avg rating 9");
    expect(answer).not.toMatch(/note|email|message/i);
  });
});
