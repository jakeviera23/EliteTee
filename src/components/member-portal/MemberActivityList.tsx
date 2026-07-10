import { useEffect, useState } from "react";
import { formatCourseRatingStars, formatCourseRatingValue } from "../../lib/courseRating";
import { getCurrentAuthUserId } from "../../lib/authUserLinking";
import {
  formatPlayedOnDate,
  getMemberInitials,
} from "../../lib/memberCourseRounds";
import type { MemberCourseRoundRecord } from "../../types/memberCourseRound";
import { RoundPhotoGallery } from "./RoundPhotoGallery";

type MemberActivityListProps = {
  rounds: MemberCourseRoundRecord[];
  emptyMessage?: string;
  allowPhotoDelete?: boolean;
  onRoundsChanged?: () => void;
};

export function MemberActivityList({
  rounds,
  emptyMessage,
  allowPhotoDelete = false,
  onRoundsChanged,
}: MemberActivityListProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!allowPhotoDelete) return;
    void getCurrentAuthUserId().then(({ userId }) => setCurrentUserId(userId));
  }, [allowPhotoDelete]);

  if (rounds.length === 0) {
    return emptyMessage ? <p className="courses-signals-early-copy">{emptyMessage}</p> : null;
  }

  return (
    <ul className="courses-activity-list">
      {rounds.map((round) => {
        const memberName = round.member_name ?? "Member";
        const photos = round.photos ?? [];
        const canDeletePhotos = allowPhotoDelete && currentUserId === round.member_user_id;

        return (
          <li key={round.id} className="courses-activity-item">
            <div className="courses-activity-head">
              <span className="courses-activity-avatar" aria-hidden="true">
                {getMemberInitials(memberName)}
              </span>
              <div>
                <p className="courses-activity-member">{memberName}</p>
                <p className="courses-activity-name">{round.course_name}</p>
              </div>
            </div>
            <p className="courses-activity-meta">
              {round.location} · {formatPlayedOnDate(round.played_on)}
            </p>
            <div className="courses-activity-rating">
              <span className="courses-activity-rating-label">Course Rating</span>
              <span
                className="courses-activity-rating-stars"
                aria-hidden="true"
              >
                {formatCourseRatingStars(round.course_rating)}
              </span>
              <span className="courses-activity-rating-value">
                {formatCourseRatingValue(round.course_rating)}
              </span>
            </div>
            {round.note.trim() ? <p className="courses-activity-note">{round.note}</p> : null}
            <p className="courses-activity-again">
              Would play again: {round.would_play_again ? "Yes" : "No"}
            </p>
            {photos.length > 0 ? (
              <RoundPhotoGallery
                photos={photos}
                allowDelete={canDeletePhotos}
                onPhotoDeleted={() => onRoundsChanged?.()}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
