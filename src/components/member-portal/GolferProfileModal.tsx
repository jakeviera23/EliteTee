import { useState } from "react";
import type { PortalGolfer } from "../../data/portalSocial";
import { FollowButton } from "./FollowButton";
import { MemberClubAvatar } from "./MemberClubAvatar";
import { RequestConnectionModal } from "./RequestConnectionModal";
import { VerifiedBadge } from "./VerifiedBadge";

type GolferProfileModalProps = {
  golfer: PortalGolfer;
  onClose: () => void;
  onFollow?: (following: boolean) => void;
};

export function GolferProfileModal({ golfer, onClose, onFollow }: GolferProfileModalProps) {
  const [showRequest, setShowRequest] = useState(false);

  return (
    <>
      <div className="portal-modal-backdrop" role="presentation" onClick={onClose}>
        <article
          className="portal-modal portal-modal--golfer"
          role="dialog"
          aria-labelledby="golfer-modal-name"
          onClick={(event) => event.stopPropagation()}
        >
          <header className="portal-modal-head">
            <div className="portal-modal-golfer-identity">
              <MemberClubAvatar member={{ club_logo_url: golfer.avatarImage ?? null }} size="lg" />
              <div>
                <h2 id="golfer-modal-name">
                  {golfer.name}
                  {golfer.isVerified ? <VerifiedBadge label="Verified golfer" /> : null}
                </h2>
                {golfer.title ? <p className="portal-golfer-title">{golfer.title}</p> : null}
                <p className="portal-golfer-location">{golfer.location}</p>
              </div>
            </div>
            <button type="button" className="portal-modal-close" onClick={onClose} aria-label="Close">
              ×
            </button>
          </header>

          <dl className="portal-golfer-stats portal-golfer-stats--rich">
            <div>
              <dt>Followers</dt>
              <dd>{golfer.followers.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Following</dt>
              <dd>{golfer.following.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Courses played</dt>
              <dd>{golfer.coursesPlayed}</dd>
            </div>
            {golfer.handicap !== undefined ? (
              <div>
                <dt>Handicap</dt>
                <dd>{golfer.handicap}</dd>
              </div>
            ) : null}
          </dl>

          <div className="portal-golfer-details portal-golfer-details--rich">
            <div className="portal-golfer-detail-block">
              <h4>Home course</h4>
              <p>{golfer.homeCourse}</p>
            </div>
            <div className="portal-golfer-detail-block">
              <h4>Bio</h4>
              <p>{golfer.bio}</p>
            </div>
            {golfer.upcomingTravel ? (
              <div className="portal-golfer-detail-block">
                <h4>Upcoming golf travel</h4>
                <p>{golfer.upcomingTravel}</p>
              </div>
            ) : null}
            <div className="portal-golfer-detail-block">
              <h4>Favorite courses</h4>
              <ul>
                {golfer.favoriteCourses.map((course) => (
                  <li key={course}>{course}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="portal-modal-actions portal-modal-actions--split">
            <FollowButton onToggle={onFollow} />
            <button
              type="button"
              className="portal-btn portal-btn--gold"
              onClick={() => setShowRequest(true)}
            >
              Request Round
            </button>
          </div>
        </article>
      </div>

      {showRequest ? (
        <RequestConnectionModal golferName={golfer.name} onClose={() => setShowRequest(false)} />
      ) : null}
    </>
  );
}
