import { experienceCopy } from "../../../data/portalSocial";
import type { ApprovedMemberDirectoryProfile } from "../../../lib/memberProfiles";
import {
  formatCourseRatingValue,
  formatCourseRatingDisplay,
} from "../../../lib/courseRating";
import { formatPlayedOnDate } from "../../../lib/memberCourseRounds";
import type { CourseMemberPlaySummary } from "../../../lib/courseDetail";
import type { MemberProfileRecord } from "../../../types/memberProfileRecord";
import type { ViewMemberProfileHandler } from "../../../types/memberProfileNavigation";
import { MemberIdentity } from "../MemberClubAvatar";

type CourseDetailMembersPlayedProps = {
  summaries: CourseMemberPlaySummary[];
  profilesByUserId: Record<string, ApprovedMemberDirectoryProfile>;
  onViewMemberProfile?: ViewMemberProfileHandler;
  onRequestIntroduction?: (member: MemberProfileRecord) => void;
  onAddPlayed?: () => void;
};

function toIntroMember(profile: ApprovedMemberDirectoryProfile): MemberProfileRecord {
  return {
    ...profile,
    email: "",
    created_at: "",
    handicap: "",
    bucket_list_course_ids: [],
  };
}

export function CourseDetailMembersPlayed({
  summaries,
  profilesByUserId,
  onViewMemberProfile,
  onRequestIntroduction,
  onAddPlayed,
}: CourseDetailMembersPlayedProps) {
  if (summaries.length === 0) {
    return (
      <div className="et-course-detail-empty">
        <p className="et-course-detail-empty-title">No members have logged this course yet</p>
        <p className="et-course-detail-empty-copy">
          Member rounds will appear here once someone shares a played round.
        </p>
        {onAddPlayed ? (
          <button type="button" className="et-btn et-btn--forest" onClick={onAddPlayed}>
            {experienceCopy.shareTitle}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <ul className="et-course-detail-members">
      {summaries.map((summary) => {
        const profile = profilesByUserId[summary.memberUserId];
        const memberForDisplay: MemberProfileRecord = profile
          ? toIntroMember(profile)
          : {
              id: summary.memberUserId,
              user_id: summary.memberUserId,
              full_name: summary.memberName,
              email: "",
              primary_club: "",
              additional_clubs: [],
              based_in: "",
              regions: [],
              industry: "",
              golf_interests: [],
              business_interests: [],
              current_request: "",
              traveling_to: "",
              handicap: "",
              bucket_list_course_ids: [],
              club_logo_url: null,
              cover_photo_url: null,
              membership_status: "",
              is_verified: false,
              founding_member_number: null,
              portal_access_enabled: true,
              created_at: "",
              updated_at: "",
            };
        const ratingDisplay =
          summary.rating !== null ? formatCourseRatingDisplay(summary.rating) : null;

        return (
          <li key={summary.memberUserId}>
            <article className="et-course-detail-member-card">
              <div className="et-course-detail-member-head">
                {onViewMemberProfile ? (
                  <button
                    type="button"
                    className="et-course-detail-member-link"
                    onClick={() =>
                      onViewMemberProfile(summary.memberUserId, summary.memberName)
                    }
                  >
                    <MemberIdentity member={memberForDisplay} size="sm" />
                  </button>
                ) : (
                  <MemberIdentity member={memberForDisplay} size="sm" />
                )}
                {ratingDisplay ? (
                  <span className="et-course-detail-member-rating">{ratingDisplay}</span>
                ) : null}
              </div>

              <dl className="et-course-detail-member-meta">
                <div>
                  <dt>Home club</dt>
                  <dd>{profile?.primary_club?.trim() || "Not shared"}</dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>{profile?.based_in?.trim() || "Not shared"}</dd>
                </div>
                <div>
                  <dt>Last played</dt>
                  <dd>{formatPlayedOnDate(summary.latestPlayedOn)}</dd>
                </div>
                {summary.rating !== null ? (
                  <div>
                    <dt>Rating given</dt>
                    <dd>{formatCourseRatingValue(summary.rating)}</dd>
                  </div>
                ) : null}
              </dl>

              <div className="et-course-detail-member-actions">
                {onViewMemberProfile ? (
                  <button
                    type="button"
                    className="et-btn et-btn--secondary"
                    onClick={() =>
                      onViewMemberProfile(summary.memberUserId, summary.memberName)
                    }
                  >
                    View Profile
                  </button>
                ) : null}
                {onRequestIntroduction && profile ? (
                  <button
                    type="button"
                    className="et-btn et-btn--forest"
                    onClick={() => onRequestIntroduction(toIntroMember(profile))}
                  >
                    Request Introduction
                  </button>
                ) : null}
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
