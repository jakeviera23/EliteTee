import type { MemberProfileRecord } from "../../types/memberProfileRecord";

type MemberProfileModalContentProps = {
  member: MemberProfileRecord;
  onRequest: () => void;
};

function ListBlock({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div className="portal-dossier-block">
      <h4>{label}</h4>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function MemberProfileModalContent({ member, onRequest }: MemberProfileModalContentProps) {
  const membershipLine =
    member.membership_status === "Founding Member"
      ? "EliteTee Founding Member"
      : "EliteTee Verified Member";

  return (
    <div className="portal-profile-modal">
      <header className="portal-dossier-header">
        <h3>{member.full_name}</h3>
        <p className="portal-dossier-membership">{membershipLine}</p>
        {member.is_verified ? <p className="portal-dossier-verified">Verified Private Member</p> : null}
      </header>
      <div className="portal-dossier-body">
        <ListBlock label="Primary Club" items={[member.primary_club]} />
        <ListBlock label="Additional Clubs" items={member.additional_clubs} />
        <ListBlock label="Based In" items={[member.based_in]} />
        <ListBlock label="Regions" items={member.regions} />
        <ListBlock label="Golf Interests" items={member.golf_interests} />
        <ListBlock label="Business Interests" items={member.business_interests} />
        <ListBlock label="Currently Seeking" items={member.current_request ? [member.current_request] : []} />
      </div>
      <button type="button" className="portal-btn portal-btn--gold" onClick={onRequest}>
        Request Private Introduction
      </button>
    </div>
  );
}
