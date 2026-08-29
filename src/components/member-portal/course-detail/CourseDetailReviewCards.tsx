import { useEffect, useState } from "react";
import {
  formatCourseRatingStars,
  formatCourseRatingValue,
} from "../../../lib/courseRating";
import { formatPlayedRoundReviewMeta } from "../../../lib/courseDisplay";
import {
  formatPlayedOnDate,
  getMemberInitials,
} from "../../../lib/memberCourseRounds";
import type { ApprovedMemberDirectoryProfile } from "../../../lib/memberProfiles";
import type { MemberCourseRoundRecord } from "../../../types/memberCourseRound";
import type { ViewMemberProfileHandler } from "../../../types/memberProfileNavigation";
import { RoundPhotoGallery } from "../RoundPhotoGallery";
import { getCurrentAuthUserId } from "../../../lib/authUserLinking";

type CourseDetailReviewCardsProps = {
  rounds: MemberCourseRoundRecord[];
  profilesByUserId: Record<string, ApprovedMemberDirectoryProfile>;
  onRoundsChanged?: () => void;
  onViewMemberProfile?: ViewMemberProfileHandler;
};

export function CourseDetailReviewCards({
  rounds,
  profilesByUserId,
  onRoundsChanged,
  onViewMemberProfile,
}: CourseDetailReviewCardsProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    void getCurrentAuthUserId().then(({ userId }) => setCurrentUserId(userId));
  }, []);

  if (rounds.length === 0) {
    return (
      <div className="et-course-detail-empty et-course-detail-empty--quiet">
        <p className="et-course-detail-empty-title">No member reviews yet.</p>
      </div>
    );
  }

  return (
    <ul className="et-course-detail-reviews">
      {rounds.map((round) => {
        const memberName = round.member_name ?? "Member";
        const profile = profilesByUserId[round.member_user_id];
        const photos = round.photos ?? [];
        const canDeletePhotos = currentUserId === round.member_user_id;

        return (
          <li key={round.id}>
            <article className="et-course-detail-review-card">
              <header className="et-course-detail-review-head">
                <div className="et-course-detail-review-member">
                  {onViewMemberProfile ? (
                    <button
                      type="button"
                      className="et-course-detail-review-member-link"
                      onClick={() => onViewMemberProfile(round.member_user_id, memberName)}
                    >
                      <span className="et-course-detail-review-avatar" aria-hidden="true">
                        {getMemberInitials(memberName)}
                      </span>
                      <span className="et-course-detail-review-member-copy">
                        <span className="et-course-detail-review-name">{memberName}</span>
                        {profile?.is_verified ? (
                          <span className="et-course-detail-review-badge">Verified</span>
                        ) : null}
                        {profile?.founding_member_number ? (
                          <span className="et-course-detail-review-badge et-course-detail-review-badge--gold">
                            Founding {profile.founding_member_number}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  ) : (
                    <>
                      <span className="et-course-detail-review-avatar" aria-hidden="true">
                        {getMemberInitials(memberName)}
                      </span>
                      <span className="et-course-detail-review-member-copy">
                        <span className="et-course-detail-review-name">{memberName}</span>
                      </span>
                    </>
                  )}
                </div>
                <div className="et-course-detail-review-rating">
                  <span className="et-course-detail-review-rating-value">
                    {formatCourseRatingValue(round.course_rating)}
                  </span>
                  <span className="et-course-detail-review-stars" aria-hidden="true">
                    {formatCourseRatingStars(round.course_rating)}
                  </span>
                </div>
              </header>

              <p className="et-course-detail-review-meta">
                {formatPlayedRoundReviewMeta(formatPlayedOnDate(round.played_on), round.location)}
              </p>

              {round.note.trim() ? (
                <p className="et-course-detail-review-note">{round.note}</p>
              ) : (
                <p className="et-course-detail-review-note et-course-detail-review-note--empty">
                  No written note for this round.
                </p>
              )}

              <p className="et-course-detail-review-again">
                Would play again: {round.would_play_again ? "Yes" : "No"}
              </p>

              {photos.length > 0 ? (
                <RoundPhotoGallery
                  photos={photos}
                  compact={false}
                  maxPreview={photos.length}
                  className="et-course-detail-review-photos"
                  allowDelete={canDeletePhotos}
                  onPhotoDeleted={() => onRoundsChanged?.()}
                />
              ) : null}
            </article>
          </li>
        );
      })}
    </ul>
  );
}
