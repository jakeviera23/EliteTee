import type {
  MemberCourseRoundInsert,
  MemberCourseRoundRecord,
} from "../types/memberCourseRound";
import { getCurrentAuthUserId } from "./authUserLinking";
import { fetchPhotosForRoundIds, groupPhotosByRoundId } from "./memberCourseRoundPhotos";
import { supabase } from "./supabase";

const MEMBER_COURSE_ROUND_RLS_ERROR =
  "Your round could not be saved because database permissions blocked the insert.";

const ROUND_SELECT =
  "id, member_user_id, golf_course_id, course_name, location, played_on, note, would_play_again, created_at";

function normalizeRound(row: Record<string, unknown>): MemberCourseRoundRecord {
  return {
    id: String(row.id ?? ""),
    member_user_id: String(row.member_user_id ?? ""),
    golf_course_id: row.golf_course_id ? String(row.golf_course_id) : null,
    course_name: String(row.course_name ?? ""),
    location: String(row.location ?? ""),
    played_on: String(row.played_on ?? ""),
    note: String(row.note ?? ""),
    would_play_again: Boolean(row.would_play_again),
    created_at: String(row.created_at ?? ""),
    member_name: row.member_name ? String(row.member_name) : undefined,
  };
}

async function attachMemberNames(
  rounds: MemberCourseRoundRecord[],
): Promise<MemberCourseRoundRecord[]> {
  if (!supabase || rounds.length === 0) return rounds;

  const userIds = [...new Set(rounds.map((round) => round.member_user_id))];
  const { data: profiles } = await supabase
    .from("member_profiles")
    .select("user_id, full_name")
    .in("user_id", userIds);

  const nameByUserId = new Map(
    (profiles ?? [])
      .filter((profile) => profile.user_id)
      .map((profile) => [profile.user_id as string, profile.full_name as string]),
  );

  return rounds.map((round) => ({
    ...round,
    member_name: nameByUserId.get(round.member_user_id) ?? "Member",
  }));
}

async function attachPhotosToRounds(
  rounds: MemberCourseRoundRecord[],
): Promise<MemberCourseRoundRecord[]> {
  if (rounds.length === 0) return rounds;

  const roundIds = rounds.map((round) => round.id);
  const { data: photos } = await fetchPhotosForRoundIds(roundIds);
  if (!photos || photos.length === 0) {
    return rounds.map((round) => ({ ...round, photos: [] }));
  }

  const photosByRoundId = groupPhotosByRoundId(photos);
  return rounds.map((round) => ({
    ...round,
    photos: photosByRoundId.get(round.id) ?? [],
  }));
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
    .select(ROUND_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { data: null, error };
  }

  const rounds = (data ?? []).map((row) => normalizeRound(row as Record<string, unknown>));
  const withNames = await attachMemberNames(rounds);
  const withPhotos = await attachPhotosToRounds(withNames);
  return { data: withPhotos, error: null };
}

export async function fetchMemberCourseRoundsForCourse({
  golfCourseId,
  limit = 50,
}: {
  golfCourseId: string;
  limit?: number;
}) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const { data, error } = await supabase
    .from("member_course_rounds")
    .select(ROUND_SELECT)
    .eq("golf_course_id", golfCourseId)
    .order("played_on", { ascending: false })
    .limit(limit);

  if (error) {
    return { data: null, error };
  }

  const rounds = (data ?? []).map((row) => normalizeRound(row as Record<string, unknown>));
  const withNames = await attachMemberNames(rounds);
  const withPhotos = await attachPhotosToRounds(withNames);
  return { data: withPhotos, error: null };
}

export async function fetchRecentlyPlayedRounds(limit = 8) {
  return fetchMemberCourseRounds(limit);
}

export async function fetchMemberCourseRoundsForUser(userId: string, limit = 12) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const { data, error } = await supabase
    .from("member_course_rounds")
    .select(ROUND_SELECT)
    .eq("member_user_id", userId)
    .order("played_on", { ascending: false })
    .limit(limit);

  if (error) {
    return { data: null, error };
  }

  const rounds = (data ?? []).map((row) => normalizeRound(row as Record<string, unknown>));
  const withNames = await attachMemberNames(rounds);
  const withPhotos = await attachPhotosToRounds(withNames);
  return { data: withPhotos, error: null };
}

export async function fetchMemberCourseRoundsForCurrentUser(limit = 12) {
  const { userId, error: sessionError } = await getCurrentAuthUserId();
  if (sessionError || !userId) {
    return {
      data: null,
      error: sessionError ?? new Error("You must be signed in to view your rounds."),
    };
  }

  return fetchMemberCourseRoundsForUser(userId, limit);
}

export async function submitMemberCourseRound(round: MemberCourseRoundInsert) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const { userId, error: sessionError } = await getCurrentAuthUserId();
  if (sessionError || !userId) {
    return { data: null, error: sessionError ?? new Error("You must be signed in to add a course.") };
  }

  const payload: Record<string, unknown> = {
    member_user_id: userId,
    course_name: round.course_name.trim(),
    location: round.location.trim(),
    played_on: round.played_on,
    note: round.note.trim(),
    would_play_again: round.would_play_again,
  };

  if (round.golf_course_id) {
    payload.golf_course_id = round.golf_course_id;
  }

  const { data, error } = await supabase
    .from("member_course_rounds")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    return { data: null, error: buildInsertError(error) };
  }

  return { data: { id: String(data.id) }, error: null };
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

export function getMemberInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "M";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}
