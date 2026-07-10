import { formatPlayedOnDate } from "../../lib/memberCourseRounds";
import type { MemberCourseRoundRecord } from "../../types/memberCourseRound";
import { RoundPhotoGallery } from "./RoundPhotoGallery";

type CourseMemberPhotosSectionProps = {
  rounds: MemberCourseRoundRecord[];
  isLoading?: boolean;
};

export function CourseMemberPhotosSection({
  rounds,
  isLoading = false,
}: CourseMemberPhotosSectionProps) {
  const roundsWithPhotos = rounds.filter((round) => (round.photos?.length ?? 0) > 0);

  if (isLoading) {
    return <p className="golf-course-member-photos-loading">Loading member photos…</p>;
  }

  if (roundsWithPhotos.length === 0) {
    return (
      <p className="golf-course-member-photos-empty">
        Members have not shared course photos here yet.
      </p>
    );
  }

  return (
    <ul className="golf-course-member-photos-by-round">
      {roundsWithPhotos.map((round) => {
        const photos = round.photos ?? [];
        const memberName = round.member_name ?? "Member";

        return (
          <li key={round.id} className="golf-course-member-photos-round">
            <header className="golf-course-member-photos-round-head">
              <p className="golf-course-member-photos-round-member">{memberName}</p>
              <p className="golf-course-member-photos-round-meta">
                {formatPlayedOnDate(round.played_on)}
              </p>
            </header>
            {round.note.trim() ? (
              <p className="golf-course-member-photos-round-note">{round.note}</p>
            ) : null}
            <RoundPhotoGallery photos={photos} compact={false} maxPreview={photos.length} />
          </li>
        );
      })}
    </ul>
  );
}
