import { MemberIdentity } from "./MemberClubAvatar";
import type { MemberProfileRecord } from "../../types/memberProfileRecord";

type MemberCardProps = {
  member: MemberProfileRecord;
  onViewProfile: (member: MemberProfileRecord) => void;
  onRequest: (member: MemberProfileRecord) => void;
};

function displayValue(value: string | null | undefined) {
  const text = value?.trim();
  return text || "—";
}

export function MemberCard({ member, onViewProfile, onRequest }: MemberCardProps) {
  const interests =
    member.golf_interests.length > 0
      ? member.golf_interests.join(", ")
      : member.business_interests.length > 0
        ? member.business_interests.join(", ")
        : "—";

  return (
    <article className="portal-member-card">
      <header className="portal-member-head">
        <button
          type="button"
          className="portal-member-head-link"
          onClick={() => onViewProfile(member)}
          aria-label={`View ${member.full_name}'s profile`}
        >
          <MemberIdentity member={member} size="sm" />
        </button>
        <span className="portal-member-fm-badge">
          {displayValue(member.founding_member_number)}
        </span>
      </header>
      <dl className="portal-member-details">
        <div>
          <dt>Home Club</dt>
          <dd>{displayValue(member.primary_club)}</dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>{displayValue(member.based_in)}</dd>
        </div>
        <div className="portal-member-details-wide">
          <dt>Interests</dt>
          <dd>{interests}</dd>
        </div>
        <div className="portal-member-details-wide">
          <dt>Current Request</dt>
          <dd>{displayValue(member.current_request)}</dd>
        </div>
        {member.traveling_to?.trim() ? (
          <div className="portal-member-details-wide">
            <dt>Traveling To</dt>
            <dd>{member.traveling_to}</dd>
          </div>
        ) : null}
      </dl>
      <div className="portal-member-actions">
        <button
          type="button"
          className="portal-btn portal-btn--outline"
          onClick={() => onViewProfile(member)}
        >
          View Profile
        </button>
        <button
          type="button"
          className="portal-btn portal-btn--gold"
          onClick={() => onRequest(member)}
        >
          Request Private Introduction
        </button>
      </div>
    </article>
  );
}
