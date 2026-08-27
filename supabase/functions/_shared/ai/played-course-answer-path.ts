import {
  buildPlayedCourseMembersAnswer,
  type CourseMemberPlayRow,
} from "./course-play-evidence.ts";

export type MatchedPlayCourse = {
  id: string;
  name: string;
  slug?: string | null;
};

export type PlayedCourseAnswerPath =
  | {
      kind: "deterministic";
      courseName: string;
      playRows: CourseMemberPlayRow[];
      answer: string;
    }
  | { kind: "insufficient" }
  | { kind: "not_applicable" };

/**
 * Decide the answer path for "who has played {course}" questions.
 * When a specific course was extracted:
 * - play rows present → deterministic recorded-rounds answer (short-circuit)
 * - otherwise → insufficient-data (never fall through to generic member ranking)
 */
export function resolvePlayedCourseAnswerPath(input: {
  extractedCourseName: string | null;
  matchedCourse: MatchedPlayCourse | null | undefined;
  playRows: CourseMemberPlayRow[];
}): PlayedCourseAnswerPath {
  if (!input.extractedCourseName) {
    return { kind: "not_applicable" };
  }

  if (!input.matchedCourse?.id) {
    return { kind: "insufficient" };
  }

  const playRows = input.playRows.filter((row) => String(row.user_id ?? "").trim());
  if (playRows.length === 0) {
    return { kind: "insufficient" };
  }

  const courseName = input.matchedCourse.name || input.extractedCourseName;
  const answer = buildPlayedCourseMembersAnswer({
    courseName,
    members: playRows.map((row) => ({
      user_id: String(row.user_id),
      full_name: String(row.full_name ?? ""),
    })),
    playRows,
  });

  if (!answer) {
    return { kind: "insufficient" };
  }

  return {
    kind: "deterministic",
    courseName,
    playRows,
    answer,
  };
}
