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
        {member.founding_member_number ? (
          <span className="portal-member-fm-badge">{member.founding_member_number}</span>
        ) : null}
      </header>
      <dl className="portal-member-details">
        <div>
          <dt>Home Club</dt>
          <dd>{member.primary_club || "—"}</dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>{member.based_in || "—"}</dd>
        </div>
        {member.traveling_to ? (
          <div>
            <dt>Traveling To</dt>
            <dd>{member.traveling_to}</dd>
          </div>
        ) : null}
        {member.golf_interests.length > 0 ? (
          <div className="portal-member-details-wide">
            <dt>Interests</dt>
            <dd>{member.golf_interests.join(", ")}</dd>
          </div>
        ) : null}
        {member.current_request?.trim() ? (
          <div className="portal-member-details-wide">
            <dt>Current Request</dt>
            <dd>{member.current_request}</dd>
          </div>
        ) : null}
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
