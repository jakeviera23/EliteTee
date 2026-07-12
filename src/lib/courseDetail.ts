import type { GolfCourseRecord } from "../types/golfCourse";
import { resolveGolfCourseDisplayImage } from "../types/golfCourse";
import type { MemberCourseRoundRecord } from "../types/memberCourseRound";
import type { MemberCourseRoundPhotoRecord } from "../types/memberCourseRoundPhoto";

export type CourseMemberPlaySummary = {
  memberUserId: string;
  memberName: string;
  latestPlayedOn: string;
  rating: number | null;
  wouldPlayAgain: boolean | null;
};

export function buildMemberPlaySummaries(
  rounds: MemberCourseRoundRecord[],
): CourseMemberPlaySummary[] {
  const byMember = new Map<string, MemberCourseRoundRecord[]>();

  for (const round of rounds) {
    const existing = byMember.get(round.member_user_id) ?? [];
    existing.push(round);
    byMember.set(round.member_user_id, existing);
  }

  return [...byMember.entries()]
    .map(([memberUserId, memberRounds]) => {
      const sorted = [...memberRounds].sort((a, b) => b.played_on.localeCompare(a.played_on));
      const latest = sorted[0]!;
      const highestRated = [...sorted].sort((a, b) => b.course_rating - a.course_rating)[0];

      return {
        memberUserId,
        memberName: latest.member_name ?? "Member",
        latestPlayedOn: latest.played_on,
        rating: highestRated?.course_rating ?? null,
        wouldPlayAgain: latest.would_play_again,
      };
    })
    .sort((a, b) => b.latestPlayedOn.localeCompare(a.latestPlayedOn));
}

export function buildCourseGalleryPhotos(
  course: Pick<GolfCourseRecord, "image_url" | "thumbnail_url">,
  rounds: MemberCourseRoundRecord[],
): MemberCourseRoundPhotoRecord[] {
  const seen = new Set<string>();
  const photos: MemberCourseRoundPhotoRecord[] = [];

  const officialUrl = resolveGolfCourseDisplayImage(course, "hero");
  if (officialUrl && !seen.has(officialUrl)) {
    seen.add(officialUrl);
    photos.push({
      id: "official-course-image",
      member_course_round_id: "",
      user_id: "",
      storage_path: "",
      sort_order: 0,
      is_featured: true,
      moderation_status: "approved",
      created_at: "",
      signed_url: officialUrl,
      caption: "Official course photo",
    });
  }

  for (const round of rounds) {
    for (const photo of round.photos ?? []) {
      const url = photo.signed_url?.trim();
      if (!url || seen.has(url)) continue;
      seen.add(url);
      photos.push({
        ...photo,
        member_name: round.member_name,
        played_on: round.played_on,
      });
    }
  }

  return photos;
}

export function buildCourseAskPrompts(courseName: string): string[] {
  const trimmed = courseName.trim() || "this course";
  return [
    `Who has played ${trimmed}?`,
    `What do members say about ${trimmed}?`,
    `Who should I contact about playing ${trimmed}?`,
    "Which similar courses have members reviewed?",
  ];
}

export function formatLatestActivityAt(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
