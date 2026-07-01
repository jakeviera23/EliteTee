import type { MemberProfileRecord } from "../../types/memberProfileRecord";

type MemberCardProps = {
  member: MemberProfileRecord;
  onViewProfile: (member: MemberProfileRecord) => void;
  onRequest: (member: MemberProfileRecord) => void;
};

export function MemberCard({ member, onViewProfile, onRequest }: MemberCardProps) {
  return (
    <article className="portal-member-card">
      <header className="portal-member-head">
        <h3>{member.full_name}</h3>
      </header>
      <dl className="portal-member-details">
        <div>
          <dt>Primary Club</dt>
          <dd>{member.primary_club}</dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>{member.based_in}</dd>
        </div>
        <div>
          <dt>Industry</dt>
          <dd>{member.industry}</dd>
        </div>
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
          Request Introduction
        </button>
      </div>
    </article>
  );
}
