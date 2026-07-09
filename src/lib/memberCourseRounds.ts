import type {
  MemberCourseRoundInsert,
  MemberCourseRoundRecord,
} from "../types/memberCourseRound";
import { getCurrentAuthUserId } from "./authUserLinking";
import { supabase } from "./supabase";

const MEMBER_COURSE_ROUND_RLS_ERROR =
  "Your round could not be saved because database permissions blocked the insert.";

function normalizeRound(row: Record<string, unknown>): MemberCourseRoundRecord {
  return {
    id: String(row.id ?? ""),
    member_user_id: String(row.member_user_id ?? ""),
    course_name: String(row.course_name ?? ""),
    location: String(row.location ?? ""),
    played_on: String(row.played_on ?? ""),
    note: String(row.note ?? ""),
    would_play_again: Boolean(row.would_play_again),
    created_at: String(row.created_at ?? ""),
  };
}

function buildInsertError(error: Error) {
  const isRlsError =
    error.message.toLowerCase().includes("row-level security") ||
    error.message.toLowerCase().includes("permission denied") ||
    (error as { code?: string }).code === "42501";

  if (isRlsError) {
    return new Error(MEMBER_COURSE_ROUND_RLS_ERROR);
  }

  return error;
}

export async function fetchMemberCourseRounds(limit = 20) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const { data, error } = await supabase
    .from("member_course_rounds")
    .select(
      "id, member_user_id, course_name, location, played_on, note, would_play_again, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { data: null, error };
  }

  return {
    data: (data ?? []).map((row) => normalizeRound(row as Record<string, unknown>)),
    error: null,
  };
}

export async function submitMemberCourseRound(round: MemberCourseRoundInsert) {
  if (!supabase) {
    return { error: new Error("Supabase is not configured.") };
  }

  const { userId, error: sessionError } = await getCurrentAuthUserId();
  if (sessionError || !userId) {
    return { error: sessionError ?? new Error("You must be signed in to add a course.") };
  }

  const payload = {
    member_user_id: userId,
    course_name: round.course_name.trim(),
    location: round.location.trim(),
    played_on: round.played_on,
    note: round.note.trim(),
    would_play_again: round.would_play_again,
  };

  const { error } = await supabase.from("member_course_rounds").insert(payload);

  if (error) {
    return { error: buildInsertError(error) };
  }

  return { error: null };
}

export function formatPlayedOnDate(playedOn: string) {
  const parsed = new Date(`${playedOn}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return playedOn;
  }

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
