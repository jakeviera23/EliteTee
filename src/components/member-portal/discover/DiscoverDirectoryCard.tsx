import {
  buildMatchReasons,
  formatMemberActivitySummary,
  formatMemberCardContext,
  getMemberPrimaryClub,
  selectInterestChips,
} from "../../../lib/discoverDirectory";
import type { MemberProfileRecord } from "../../../types/memberProfileRecord";
import { DiscoverMemberAvatar } from "./DiscoverMemberAvatar";
import { ClubMark } from "../ClubMark";

type DiscoverDirectoryCardProps = {
  member: MemberProfileRecord;
  viewer: MemberProfileRecord | null;
  showMatchReasons?: boolean;
  matchReasonsOverride?: string[];
  onViewProfile: (member: MemberProfileRecord) => void;
  onRequestIntroduction: (member: MemberProfileRecord) => void;
  onMessageMember?: (member: MemberProfileRecord) => void;
  variant?: "standard" | "spotlight";
  contextLabel?: string;
};

export function DiscoverDirectoryCard({
  member,
  viewer,
  showMatchReasons = false,
  matchReasonsOverride,
  onViewProfile,
  onRequestIntroduction,
  onMessageMember,
  variant = "standard",
  contextLabel,
}: DiscoverDirectoryCardProps) {
  const interestChips = selectInterestChips(member, 1);
  const cardContext = formatMemberCardContext(viewer, member);
  const matchReasons =
    matchReasonsOverride ??
    (showMatchReasons
      ? (cardContext ? [cardContext] : buildMatchReasons(viewer, member).slice(0, 1))
      : []);
  const activitySummary = formatMemberActivitySummary(member.updated_at);
  const location = member.based_in.trim();
  const club = getMemberPrimaryClub(member);
  const travel = member.traveling_to.trim();
  const canMessage = Boolean(onMessageMember && member.user_id !== viewer?.user_id);

  return (
    <article className={`et-discover-card et-discover-card--${variant}`}>
      {contextLabel ? <p className="et-discover-card-context">{contextLabel}</p> : null}
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
            {member.is_verified ? (
              <div className="et-discover-card-badges">
                <span className="et-discover-badge et-discover-badge--verified">Verified</span>
              </div>
            ) : null}
          </div>
        </button>
      </header>

      {club || location ? (
        <div className="et-discover-card-club">
          {club ? <ClubMark name={club} size="sm" /> : null}
          <div>
            {club ? <p className="et-discover-card-club-name">{club}</p> : null}
            {location ? <p className="et-discover-card-location">{location}</p> : null}
          </div>
        </div>
      ) : null}

      {interestChips.length > 0 ? (
        <ul className="et-discover-card-chips" aria-label="Interests">
          {interestChips.map((chip) => (
            <li key={chip}>
              <span className="et-discover-chip">{chip}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="et-discover-card-footnote">
        {travel ? <span>Travel · {travel}</span> : null}
        {activitySummary ? <span>{activitySummary}</span> : null}
      </div>

      {matchReasons.length > 0 ? (
        <ul className="et-discover-card-reasons" aria-label="Match reasons">
          {matchReasons.map((reason) => (
            <li key={reason}>
              <span className="et-discover-reason">{reason}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className={`et-discover-card-actions${canMessage ? "" : " et-discover-card-actions--two"}`}>
        <button
          type="button"
          className="et-btn et-btn--forest et-discover-card-intro"
          onClick={() => onRequestIntroduction(member)}
        >
          Request introduction
        </button>
        <button type="button" className="et-discover-card-profile" onClick={() => onViewProfile(member)}>
          View profile
        </button>
        {canMessage && onMessageMember ? (
          <button type="button" className="et-discover-card-message" onClick={() => onMessageMember(member)}>
            Message
          </button>
        ) : null}
      </div>
    </article>
  );
}
