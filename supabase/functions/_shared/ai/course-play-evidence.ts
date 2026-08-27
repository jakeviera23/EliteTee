import type { RoundSummary } from "./types.ts";

export type CoursePlayEvidence = {
  course_name: string;
  course_slug: string | null;
  round_count: number;
  avg_rating: number | null;
};

export type CoursePlayEvidenceByMember = Record<string, CoursePlayEvidence[]>;

export type CourseMemberPlayRow = {
  user_id: string;
  full_name?: string | null;
  round_count?: number | null;
  avg_course_rating?: number | null;
};

function normalizeUserId(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function coerceFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Build structured course-play evidence from round summaries (no free-text notes).
 * Optionally boost/focus a matched course from ai_members_by_course.
 */
export function buildCoursePlayEvidenceByMember({
  rounds,
  focusCourseName,
  focusCourseSlug,
  focusCourseMembers,
  limitPerMember = 3,
}: {
  rounds: RoundSummary[];
  focusCourseName?: string | null;
  focusCourseSlug?: string | null;
  focusCourseMembers?: CourseMemberPlayRow[] | null;
  limitPerMember?: number;
}): CoursePlayEvidenceByMember {
  const byUser = new Map<
    string,
    Map<string, { course_name: string; course_slug: string | null; ratings: number[]; count: number }>
  >();

  for (const round of rounds) {
    const userId = normalizeUserId(round.user_id);
    const courseName = String(round.course_name ?? "").trim();
    if (!userId || !courseName) continue;

    const key = courseName.toLowerCase();
    if (!byUser.has(userId)) byUser.set(userId, new Map());
    const courses = byUser.get(userId)!;
    const existing = courses.get(key) ?? {
      course_name: courseName,
      course_slug: round.course_slug ?? null,
      ratings: [] as number[],
      count: 0,
    };
    existing.count += 1;
    const rating = coerceFiniteNumber(round.course_rating);
    if (rating != null) existing.ratings.push(rating);
    if (!existing.course_slug && round.course_slug) {
      existing.course_slug = round.course_slug;
    }
    courses.set(key, existing);
  }

  const focusName = focusCourseName?.trim() ?? "";
  const focusKey = focusName.toLowerCase();

  if (focusName && focusCourseMembers) {
    for (const row of focusCourseMembers) {
      const userId = normalizeUserId(row.user_id);
      if (!userId) continue;
      if (!byUser.has(userId)) byUser.set(userId, new Map());
      const courses = byUser.get(userId)!;
      const existing = courses.get(focusKey) ?? {
        course_name: focusName,
        course_slug: focusCourseSlug ?? null,
        ratings: [] as number[],
        count: 0,
      };
      const rpcCount = coerceFiniteNumber(row.round_count) ?? 0;
      // Presence in ai_members_by_course means at least one recorded round.
      existing.count = Math.max(existing.count, rpcCount, 1);
      const avg = coerceFiniteNumber(row.avg_course_rating);
      if (avg != null && existing.ratings.length === 0) {
        existing.ratings.push(avg);
      }
      if (!existing.course_slug && focusCourseSlug) {
        existing.course_slug = focusCourseSlug;
      }
      courses.set(focusKey, existing);
    }
  }

  const result: CoursePlayEvidenceByMember = {};

  for (const [userId, courses] of byUser) {
    const entries: CoursePlayEvidence[] = [...courses.values()].map((entry) => ({
      course_name: entry.course_name,
      course_slug: entry.course_slug,
      round_count: entry.count,
      avg_rating:
        entry.ratings.length > 0
          ? Math.round((entry.ratings.reduce((sum, value) => sum + value, 0) / entry.ratings.length) * 10) /
            10
          : null,
    }));

    entries.sort((left, right) => {
      if (focusKey) {
        const leftFocus = left.course_name.toLowerCase() === focusKey ? 1 : 0;
        const rightFocus = right.course_name.toLowerCase() === focusKey ? 1 : 0;
        if (leftFocus !== rightFocus) return rightFocus - leftFocus;
      }
      return right.round_count - left.round_count || left.course_name.localeCompare(right.course_name);
    });

    result[userId] = entries.slice(0, limitPerMember);
  }

  return result;
}

/**
 * Deterministic answer for "who has played {course}" using structured play evidence only.
 * Prefer RPC play rows when provided so answer-path does not depend on evidence-map key quirks.
 */
export function buildPlayedCourseMembersAnswer(input: {
  courseName: string;
  members: Array<{ user_id: string; full_name: string }>;
  evidenceByMember?: CoursePlayEvidenceByMember;
  /** Direct ai_members_by_course rows — preferred short-circuit source. */
  playRows?: CourseMemberPlayRow[] | null;
}): string {
  const courseName = input.courseName.trim();
  if (!courseName) return "";

  const lines: string[] = [];

  if (input.playRows && input.playRows.length > 0) {
    for (const row of input.playRows) {
      const name = String(row.full_name ?? "").trim() || "An EliteTee member";
      const roundCount = Math.max(1, coerceFiniteNumber(row.round_count) ?? 1);
      const avg = coerceFiniteNumber(row.avg_course_rating);
      const bits = [`${roundCount} recorded round${roundCount === 1 ? "" : "s"}`];
      if (avg != null) bits.push(`avg rating ${avg}`);
      lines.push(`- ${name} — ${bits.join(", ")}`);
    }
  } else {
    const focusKey = courseName.toLowerCase();
    const evidenceByMember = input.evidenceByMember ?? {};
    for (const member of input.members) {
      const userId = normalizeUserId(member.user_id);
      const play = (evidenceByMember[userId] ?? evidenceByMember[member.user_id] ?? []).find(
        (entry) => entry.course_name.toLowerCase() === focusKey,
      );
      if (!play || play.round_count <= 0) continue;

      const name = member.full_name.trim() || "An EliteTee member";
      const bits: string[] = [
        `${play.round_count} recorded round${play.round_count === 1 ? "" : "s"}`,
      ];
      if (typeof play.avg_rating === "number" && Number.isFinite(play.avg_rating)) {
        bits.push(`avg rating ${play.avg_rating}`);
      }
      lines.push(`- ${name} — ${bits.join(", ")}`);
    }
  }

  if (lines.length === 0) return "";

  return `These EliteTee members have recorded rounds at ${courseName}:\n\n${lines.join("\n")}`;
}
