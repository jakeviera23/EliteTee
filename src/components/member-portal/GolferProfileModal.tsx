import type { PortalGolfer } from "../../data/portalSocial";
import { earlyStageCopy } from "../../data/portalSocial";
import { useComingSoon } from "./ComingSoonProvider";
import { FollowButton } from "./FollowButton";
import { MemberClubAvatar } from "./MemberClubAvatar";
import { VerifiedBadge } from "./VerifiedBadge";

type GolferProfileModalProps = {
  golfer: PortalGolfer;
  onClose: () => void;
};

export function GolferProfileModal({ golfer, onClose }: GolferProfileModalProps) {
  const dialogRef = useRef<HTMLElement>(null);
  useDialogFocus({ dialogRef, onEscape: onClose });
  const { showComingSoon } = useComingSoon();
  const isExample = golfer.name.toLowerCase().includes("example");

  return (
    <div className="portal-modal-backdrop" role="presentation" onClick={onClose}>
      <article
        ref={dialogRef}
        className="portal-modal portal-modal--golfer"
        role="dialog"
        aria-modal="true"
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
              {isExample ? (
                <p className="portal-early-badge">{earlyStageCopy.earlyCommunity}</p>
              ) : null}
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
            <dd>{golfer.followers}</dd>
          </div>
          <div>
            <dt>Following</dt>
            <dd>{golfer.following}</dd>
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

        <p className="portal-profile-stats-note">{earlyStageCopy.profileStatsNote}</p>

        <div className="portal-golfer-details portal-golfer-details--rich">
          <div className="portal-golfer-detail-block">
            <h4>Home course</h4>
            <p>{golfer.homeCourse || "—"}</p>
          </div>
          <div className="portal-golfer-detail-block">
            <h4>Bio</h4>
            <p>{golfer.bio || earlyStageCopy.memberActivityPending}</p>
          </div>
          {golfer.upcomingTravel ? (
            <div className="portal-golfer-detail-block">
              <h4>Upcoming golf travel</h4>
              <p>{golfer.upcomingTravel}</p>
            </div>
          ) : null}
          {golfer.favoriteCourses.length > 0 ? (
            <div className="portal-golfer-detail-block">
              <h4>Favorite courses</h4>
              <ul>
                {golfer.favoriteCourses.map((course) => (
                  <li key={course}>{course}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="portal-modal-actions portal-modal-actions--split">
          <FollowButton />
          <button
            type="button"
            className="portal-btn portal-btn--gold"
            onClick={() => showComingSoon("Request Round")}
          >
            Request Round
          </button>
        </div>
      </article>
    </div>
  );
}
import { useRef } from "react";
import { useDialogFocus } from "../../hooks/useDialogFocus";
