import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatCourseRatingStars, formatCourseRatingValue } from "../../lib/courseRating";
import { getCurrentAuthUserId } from "../../lib/authUserLinking";
import {
  formatPlayedOnDate,
  getMemberInitials,
} from "../../lib/memberCourseRounds";
import type { MemberCourseRoundRecord } from "../../types/memberCourseRound";
import type { ViewMemberProfileHandler } from "../../types/memberProfileNavigation";
import { RoundPhotoGallery } from "./RoundPhotoGallery";

type MemberActivityListProps = {
  rounds: MemberCourseRoundRecord[];
  emptyMessage?: string;
  showMemberIdentity?: boolean;
  allowPhotoDelete?: boolean;
  onRoundsChanged?: () => void;
  onViewMemberProfile?: ViewMemberProfileHandler;
};

export function MemberActivityList({
  rounds,
  emptyMessage,
  showMemberIdentity = true,
  allowPhotoDelete = false,
  onRoundsChanged,
  onViewMemberProfile,
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
        const courseLabel = round.course_name.trim() || "Course";

        return (
          <li key={round.id} className="courses-activity-item">
            {showMemberIdentity ? (
              <div className="courses-activity-head">
                {onViewMemberProfile ? (
                  <button
                    type="button"
                    className="courses-activity-member-link"
                    onClick={() =>
                      onViewMemberProfile(round.member_user_id, memberName)
                    }
                  >
                    <span className="courses-activity-avatar" aria-hidden="true">
                      {getMemberInitials(memberName)}
                    </span>
                    <p className="courses-activity-member">{memberName}</p>
                  </button>
                ) : (
                  <>
                    <span className="courses-activity-avatar" aria-hidden="true">
                      {getMemberInitials(memberName)}
                    </span>
                    <div>
                      <p className="courses-activity-member">{memberName}</p>
                    </div>
                  </>
                )}
                <div>
                  {round.course_slug ? (
                    <Link
                      to={`/courses/${round.course_slug}`}
                      className="courses-activity-name courses-activity-name--link"
                    >
                      {courseLabel}
                    </Link>
                  ) : (
                    <p className="courses-activity-name">{courseLabel}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="courses-activity-head">
                {round.course_slug ? (
                  <Link
                    to={`/courses/${round.course_slug}`}
                    className="courses-activity-name courses-activity-name--link"
                  >
                    {courseLabel}
                  </Link>
                ) : (
                  <p className="courses-activity-name">{courseLabel}</p>
                )}
              </div>
            )}
            <p className="courses-activity-meta">
              {round.location} · {formatPlayedOnDate(round.played_on)}
            </p>
            <div className="courses-activity-rating">
              <span className="courses-activity-rating-label">Course Rating</span>
              <span className="courses-activity-rating-stars" aria-hidden="true">
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
