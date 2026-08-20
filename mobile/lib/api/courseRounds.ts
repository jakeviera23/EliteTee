import type { MobileCourseRoundRecord } from "@/types/courseRoundPhoto";
import { validateCourseRating } from "../courseRating";
import { findOrCreateMemberGolfCourse } from "./courses";
import { attachPhotosToRounds, fetchPhotosForRoundIds } from "./courseRoundPhotos";
import { getCurrentUserId } from "./members";
import { requireSupabase } from "../supabase";

const ROUND_SELECT =
  "id, member_user_id, golf_course_id, course_name, location, played_on, note, would_play_again, course_rating, cover_photo_id, created_at";

export type MemberCourseRoundInsert = {
  course_name: string;
  location: string;
  played_on: string;
  note: string;
  would_play_again: boolean;
  course_rating: number;
  golf_course_id?: string | null;
};

function normalizeRound(row: Record<string, unknown>): MobileCourseRoundRecord {
  return {
    id: String(row.id ?? ""),
    member_user_id: String(row.member_user_id ?? ""),
    golf_course_id: row.golf_course_id ? String(row.golf_course_id) : null,
    course_name: String(row.course_name ?? ""),
    location: String(row.location ?? ""),
    played_on: String(row.played_on ?? ""),
    note: String(row.note ?? ""),
    would_play_again: Boolean(row.would_play_again),
    course_rating: Number(row.course_rating ?? 10),
    cover_photo_id: row.cover_photo_id ? String(row.cover_photo_id) : null,
    created_at: String(row.created_at ?? ""),
  };
}

async function attachMemberNames(rounds: MobileCourseRoundRecord[]) {
  if (rounds.length === 0) return rounds;

  const client = requireSupabase();
  const userIds = [...new Set(rounds.map((round) => round.member_user_id))];
  const { data: profiles } = await client
    .from("member_profiles")
    .select("user_id, full_name")
    .in("user_id", userIds);

  const nameByUserId = new Map(
    (profiles ?? [])
      .filter((profile) => profile.user_id)
      .map((profile) => [String(profile.user_id), String(profile.full_name ?? "Member")]),
  );

  return rounds.map((round) => ({
    ...round,
    member_name: nameByUserId.get(round.member_user_id) ?? "Member",
  }));
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

export async function submitMemberCourseRound(round: MemberCourseRoundInsert) {
  const { userId, error: sessionError } = await getCurrentUserId();
  if (sessionError || !userId) {
    return { data: null, error: sessionError ?? new Error("You must be signed in.") };
  }

  let golfCourseId = round.golf_course_id ?? null;

  if (!golfCourseId) {
    const { data: linkedCourse, error: linkError } = await findOrCreateMemberGolfCourse(
      round.course_name,
      round.location,
    );

    if (linkError || !linkedCourse?.id) {
      return {
        data: null,
        error: linkError ?? new Error("This course could not be added to the EliteTee directory."),
      };
    }

    golfCourseId = linkedCourse.id;
  }

  const ratingResult = validateCourseRating(round.course_rating);
  if (!ratingResult.ok) {
    return { data: null, error: new Error(ratingResult.message) };
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("member_course_rounds")
    .insert({
      member_user_id: userId,
      course_name: round.course_name.trim(),
      location: round.location.trim(),
      played_on: round.played_on,
      note: round.note.trim(),
      would_play_again: round.would_play_again,
      course_rating: ratingResult.value,
      golf_course_id: golfCourseId,
    })
    .select("id")
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data: { id: String(data.id), golf_course_id: golfCourseId }, error: null };
}

export async function fetchMemberCourseRoundsForCourse({
  golfCourseId,
  limit = 50,
}: {
  golfCourseId: string;
  limit?: number;
}) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("member_course_rounds")
    .select(ROUND_SELECT)
    .eq("golf_course_id", golfCourseId)
    .order("played_on", { ascending: false })
    .limit(limit);

  if (error) {
    return { data: [] as MobileCourseRoundRecord[], error };
  }

  const rounds = (data ?? []).map((row) => normalizeRound(row as Record<string, unknown>));
  const withNames = await attachMemberNames(rounds);
  const withPhotos = await attachPhotosToRounds(withNames);
  return { data: withPhotos, error: null };
}

export async function fetchPhotosForRoundIdsPublic(roundIds: string[]) {
  return fetchPhotosForRoundIds(roundIds);
}
