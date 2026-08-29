import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatCourseRatingStars, formatCourseRatingValue } from "../../lib/courseRating";
import { getCurrentAuthUserId } from "../../lib/authUserLinking";
import {
  formatPlayedOnDate,
  getMemberInitials,
} from "../../lib/memberCourseRounds";
import {
  truncateProfileExperienceNote,
} from "../../lib/profilePageDisplay";
import { isMeaningfulProfileText } from "../../lib/portalProfileDisplay";
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
  variant?: "default" | "profile";
  maxItems?: number;
};

export function MemberActivityList({
  rounds,
  emptyMessage,
  showMemberIdentity = true,
  allowPhotoDelete = false,
  onRoundsChanged,
  onViewMemberProfile,
  variant = "default",
  maxItems,
}: MemberActivityListProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(() => new Set());
  const isProfileVariant = variant === "profile";
  const visibleRounds = maxItems ? rounds.slice(0, maxItems) : rounds;
  const hiddenRoundCount = Math.max(0, rounds.length - visibleRounds.length);

  useEffect(() => {
    if (!allowPhotoDelete) return;
    void getCurrentAuthUserId().then(({ userId }) => setCurrentUserId(userId));
  }, [allowPhotoDelete]);

  if (rounds.length === 0) {
    return emptyMessage ? <p className="courses-signals-early-copy">{emptyMessage}</p> : null;
  }

  function toggleNote(roundId: string) {
    setExpandedNotes((current) => {
      const next = new Set(current);
      if (next.has(roundId)) {
        next.delete(roundId);
      } else {
        next.add(roundId);
      }
      return next;
    });
  }

  return (
    <>
      <ul
        className={`courses-activity-list${
          isProfileVariant ? " courses-activity-list--profile" : ""
        }`}
      >
        {visibleRounds.map((round) => {
          const memberName = round.member_name ?? "Member";
          const photos = round.photos ?? [];
          const canDeletePhotos = allowPhotoDelete && currentUserId === round.member_user_id;
          const courseLabel = round.course_name.trim() || "Course";
          const note = round.note.trim();
          const notePreview = truncateProfileExperienceNote(note);
          const isNoteExpanded = expandedNotes.has(round.id);
          const showFullNote = isNoteExpanded || !notePreview.isTruncated;
          const locationLabel = isMeaningfulProfileText(round.location) ? round.location.trim() : "";
          const playedOnLabel = formatPlayedOnDate(round.played_on);
          const ratingValue = formatCourseRatingValue(round.course_rating);

          if (isProfileVariant && !showMemberIdentity) {
            const metaParts = [locationLabel, playedOnLabel].filter(Boolean);

            return (
              <li key={round.id} className="courses-activity-item courses-activity-item--profile">
                <div className="courses-activity-profile-row">
                  {photos.length > 0 ? (
                    <RoundPhotoGallery
                      photos={photos}
                      compact
                      maxPreview={1}
                      className="courses-activity-gallery--profile"
                      allowDelete={canDeletePhotos}
                      onPhotoDeleted={() => onRoundsChanged?.()}
                    />
                  ) : (
                    <div
                      className="courses-activity-profile-thumb-fallback"
                      aria-hidden="true"
                    />
                  )}

                  <div className="courses-activity-profile-body">
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

                    <p className="courses-activity-profile-meta">
                      {metaParts.length > 0 ? (
                        <span className="courses-activity-meta">{metaParts.join(" · ")}</span>
                      ) : null}
                      {ratingValue ? (
                        <span className="courses-activity-profile-rating">{ratingValue} rating</span>
                      ) : null}
                    </p>

                    {note ? (
                      <div className="courses-activity-note-block">
                        <p
                          className={`courses-activity-note${
                            !showFullNote ? " courses-activity-note--clamped" : ""
                          }`}
                        >
                          {showFullNote ? note : notePreview.preview}
                        </p>
                        {notePreview.isTruncated ? (
                          <button
                            type="button"
                            className="courses-activity-note-toggle"
                            onClick={() => toggleNote(round.id)}
                            aria-expanded={isNoteExpanded}
                          >
                            {isNoteExpanded ? "Show less" : "View full review"}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          }

          return (
            <li
              key={round.id}
              className={`courses-activity-item${
                isProfileVariant ? " courses-activity-item--profile" : ""
              }`}
            >
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
                <div
                  className={`courses-activity-head${
                    isProfileVariant ? " courses-activity-head--profile" : ""
                  }`}
                >
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
                  {isProfileVariant ? (
                    <div className="courses-activity-profile-meta">
                      <p className="courses-activity-meta">
                        {round.location} · {formatPlayedOnDate(round.played_on)}
                      </p>
                      <div className="courses-activity-rating courses-activity-rating--inline">
                        <span className="courses-activity-rating-label">Rating</span>
                        <span className="courses-activity-rating-stars" aria-hidden="true">
                          {formatCourseRatingStars(round.course_rating)}
                        </span>
                        <span className="courses-activity-rating-value">
                          {formatCourseRatingValue(round.course_rating)}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {!isProfileVariant ? (
                <>
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
                </>
              ) : null}

              {note ? (
                isProfileVariant ? (
                  <div className="courses-activity-note-block">
                    <p
                      className={`courses-activity-note${
                        !showFullNote ? " courses-activity-note--clamped" : ""
                      }`}
                    >
                      {showFullNote ? note : notePreview.preview}
                    </p>
                    {notePreview.isTruncated ? (
                      <button
                        type="button"
                        className="courses-activity-note-toggle"
                        onClick={() => toggleNote(round.id)}
                        aria-expanded={isNoteExpanded}
                      >
                        {isNoteExpanded ? "Show less" : "View full review"}
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <p className="courses-activity-note">{note}</p>
                )
              ) : null}

              {!isProfileVariant ? (
                <p className="courses-activity-again">
                  Would play again: {round.would_play_again ? "Yes" : "No"}
                </p>
              ) : null}

              {photos.length > 0 ? (
                <RoundPhotoGallery
                  photos={photos}
                  compact
                  maxPreview={isProfileVariant ? 1 : 3}
                  className={isProfileVariant ? "courses-activity-gallery--profile" : ""}
                  allowDelete={canDeletePhotos}
                  onPhotoDeleted={() => onRoundsChanged?.()}
                />
              ) : null}
            </li>
          );
        })}
      </ul>
      {isProfileVariant && hiddenRoundCount > 0 ? (
        <p className="courses-activity-profile-more">
          Showing the latest {visibleRounds.length} of {rounds.length} shared experiences.
        </p>
      ) : null}
    </>
  );
}
