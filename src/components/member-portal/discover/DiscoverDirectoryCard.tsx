import {
  buildMatchReasons,
  formatMemberActivitySummary,
  selectInterestChips,
  truncateDiscoverText,
} from "../../../lib/discoverDirectory";
import type { MemberProfileRecord } from "../../../types/memberProfileRecord";
import { DiscoverMemberAvatar } from "./DiscoverMemberAvatar";

type DiscoverDirectoryCardProps = {
  member: MemberProfileRecord;
  viewer: MemberProfileRecord | null;
  showMatchReasons?: boolean;
  matchReasonsOverride?: string[];
  onViewProfile: (member: MemberProfileRecord) => void;
  onRequestIntroduction: (member: MemberProfileRecord) => void;
  onMessageMember?: (member: MemberProfileRecord) => void;
};

export function DiscoverDirectoryCard({
  member,
  viewer,
  showMatchReasons = false,
  matchReasonsOverride,
  onViewProfile,
  onRequestIntroduction,
  onMessageMember,
}: DiscoverDirectoryCardProps) {
  const interestChips = selectInterestChips(member, 4);
  const matchReasons =
    matchReasonsOverride ??
    (showMatchReasons ? buildMatchReasons(viewer, member) : []);
  const activitySummary = formatMemberActivitySummary(member.updated_at);
  const currentRequest = member.current_request.trim();
  const location = member.based_in.trim();
  const club = member.primary_club.trim();
  const travel = member.traveling_to.trim();

  return (
    <article className="et-discover-card">
      <header className="et-discover-card-head">
        <button
          type="button"
          className="et-discover-card-identity"
          onClick={() => onViewProfile(member)}
          aria-label={`View ${member.full_name}'s profile`}
        >
          <DiscoverMemberAvatar member={member} size="lg" />
          <div className="et-discover-card-copy">
            <h3 className="et-discover-card-name">{member.full_name}</h3>
            <div className="et-discover-card-badges">
              {member.is_verified ? (
                <span className="et-discover-badge et-discover-badge--verified">Verified</span>
              ) : null}
              {member.founding_member_number ? (
                <span className="et-discover-badge et-discover-badge--gold">
                  Founding {member.founding_member_number}
                </span>
              ) : null}
            </div>
          </div>
        </button>
      </header>

      <dl className="et-discover-card-meta">
        <div>
          <dt>Home club</dt>
          <dd>{club || "Not shared"}</dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>{location || "Not shared"}</dd>
        </div>
      </dl>

      {currentRequest ? (
        <p className="et-discover-card-request">{truncateDiscoverText(currentRequest)}</p>
      ) : (
        <p className="et-discover-card-request et-discover-card-request--empty">
          No current connection request shared.
        </p>
      )}

      {interestChips.length > 0 ? (
        <ul className="et-discover-card-chips" aria-label="Interests">
          {interestChips.map((chip) => (
            <li key={chip}>
              <span className="et-discover-chip">{chip}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {travel ? <p className="et-discover-card-travel">Traveling to {travel}</p> : null}

      {activitySummary ? (
        <p className="et-discover-card-activity">{activitySummary}</p>
      ) : null}

      {matchReasons.length > 0 ? (
        <ul className="et-discover-card-reasons" aria-label="Match reasons">
          {matchReasons.map((reason) => (
            <li key={reason}>
              <span className="et-discover-reason">{reason}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="et-discover-card-actions">
        <button type="button" className="et-btn et-btn--secondary" onClick={() => onViewProfile(member)}>
          View Profile
        </button>
        <button
          type="button"
          className="et-btn et-btn--forest"
          onClick={() => onRequestIntroduction(member)}
        >
          Request Introduction
        </button>
        {onMessageMember && member.user_id !== viewer?.user_id ? (
          <button type="button" className="et-btn et-btn--ghost" onClick={() => onMessageMember(member)}>
            Message
          </button>
        ) : null}
      </div>
    </article>
  );
}
