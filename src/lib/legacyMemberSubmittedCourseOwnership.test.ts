import { describe, expect, it } from "vitest";

type LegacyRoundLink = {
  golf_course_id: string;
  member_user_id: string;
  created_at: string;
  played_on: string;
  id: string;
};

/** Mirrors migration 054 earliest-round ownership inference. */
function inferLegacyCourseOwnerFromEarliestRound(
  rounds: LegacyRoundLink[],
  golfCourseId: string,
): string | null {
  const linked = rounds
    .filter((round) => round.golf_course_id === golfCourseId && round.member_user_id)
    .sort((left, right) => {
      const createdCompare = left.created_at.localeCompare(right.created_at);
      if (createdCompare !== 0) return createdCompare;
      const playedCompare = left.played_on.localeCompare(right.played_on);
      if (playedCompare !== 0) return playedCompare;
      return left.id.localeCompare(right.id);
    });

  return linked[0]?.member_user_id ?? null;
}

describe("legacy member-submitted course ownership backfill", () => {
  it("uses the earliest linked round member as owner", () => {
    const owner = inferLegacyCourseOwnerFromEarliestRound(
      [
        {
          golf_course_id: "course-laurel",
          member_user_id: "user-later",
          created_at: "2026-07-12T10:00:00.000Z",
          played_on: "2026-07-01",
          id: "round-2",
        },
        {
          golf_course_id: "course-laurel",
          member_user_id: "user-original",
          created_at: "2026-07-10T10:00:00.000Z",
          played_on: "2026-06-15",
          id: "round-1",
        },
      ],
      "course-laurel",
    );

    expect(owner).toBe("user-original");
  });

  it("leaves ownership null when no linked rounds exist", () => {
    expect(inferLegacyCourseOwnerFromEarliestRound([], "course-orphan")).toBeNull();
  });
});
