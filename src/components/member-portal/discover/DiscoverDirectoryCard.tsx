import {
  formatMemberActivitySummary,
  selectInterestChips,
} from "../../../lib/discoverDirectory";
import type { MemberRelationshipContext } from "../../../lib/memberRelationships";
import type { MemberProfileRecord } from "../../../types/memberProfileRecord";
import { MemberRelationshipActions } from "../MemberRelationshipActions";
import { DiscoverMemberAvatar } from "./DiscoverMemberAvatar";

type DiscoverDirectoryCardProps = {
  member: MemberProfileRecord;
  viewer: MemberProfileRecord | null;
  relationshipContext?: MemberRelationshipContext | null;
  /** Optional match reasons for Ask EliteTee / special contexts. Discover omits these. */
  matchReasonsOverride?: string[];
  onViewProfile: (member: MemberProfileRecord) => void;
  onRequestIntroduction?: (member: MemberProfileRecord) => void;
  onRespondToIntroduction?: (requestId: string) => void;
  onMessageMember?: (member: MemberProfileRecord) => void;
};

export function DiscoverDirectoryCard({
  member,
  viewer,
  relationshipContext = null,
  matchReasonsOverride,
  onViewProfile,
  onRequestIntroduction,
  onRespondToIntroduction,
  onMessageMember,
}: DiscoverDirectoryCardProps) {
  const interestChips = selectInterestChips(member, 2);
  const activitySummary = formatMemberActivitySummary(member.updated_at);
  const currentRequest = member.current_request.trim();
  const location = member.based_in.trim();
  const club = member.primary_club.trim();
  const travel = member.traveling_to.trim();
  const memberUserId = member.user_id?.trim() ?? "";
  const showRelationshipActions =
    Boolean(memberUserId) &&
    Boolean(viewer?.user_id) &&
    memberUserId !== viewer?.user_id &&
    Boolean(
      onRequestIntroduction || onRespondToIntroduction || onMessageMember,
    );
  const matchReasons = (matchReasonsOverride ?? []).slice(0, 2);

  return (
    <article className="et-discover-card">
      <header className="et-discover-card-head">
        <button
          type="button"
          className="et-discover-card-identity"
          onClick={() => onViewProfile(member)}
          aria-label={`View ${member.full_name}'s profile`}
        >
          <DiscoverMemberAvatar member={member} size="md" />
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
          <dd title={club || undefined}>{club || "Not shared"}</dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd title={location || undefined}>{location || "Not shared"}</dd>
        </div>
      </dl>

      {currentRequest ? <p className="et-discover-card-request">{currentRequest}</p> : null}

      {interestChips.length > 0 ? (
        <ul className="et-discover-card-chips" aria-label="Interests">
          {interestChips.map((chip) => (
            <li key={chip}>
              <span className="et-discover-chip" title={chip}>
                {chip}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {travel ? (
        <p className="et-discover-card-travel" title={`Traveling to ${travel}`}>
          Traveling to {travel}
        </p>
      ) : null}

      {activitySummary ? (
        <p className="et-discover-card-activity">{activitySummary}</p>
      ) : null}

      {matchReasons.length > 0 ? (
        <ul className="et-discover-card-reasons" aria-label="Match reasons">
          {matchReasons.map((reason) => (
            <li key={reason}>
              <span className="et-discover-reason" title={reason}>
                {reason}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="et-discover-card-actions">
        <button type="button" className="et-btn et-btn--secondary" onClick={() => onViewProfile(member)}>
          View Profile
        </button>
        {showRelationshipActions ? (
          <MemberRelationshipActions
            otherUserId={memberUserId}
            context={relationshipContext}
            onRequestIntroduction={() => onRequestIntroduction?.(member)}
            onRespondToRequest={onRespondToIntroduction}
            onMessage={() => onMessageMember?.(member)}
          />
        ) : null}
      </div>
    </article>
  );
}
