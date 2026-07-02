import { MemberIdentity } from "./MemberClubAvatar";
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
        <MemberIdentity member={member} size="sm" />
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
        {member.traveling_to ? (
          <div>
            <dt>Traveling To</dt>
            <dd>{member.traveling_to}</dd>
          </div>
        ) : null}
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
          View Dossier
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
