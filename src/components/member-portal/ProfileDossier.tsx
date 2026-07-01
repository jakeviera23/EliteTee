import { memberDossier } from "../../data/memberPortalDirectory";

function DossierBlock({ label, items }: { label: string; items: readonly string[] }) {
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

export function ProfileDossier() {
  return (
    <article className="portal-dossier portal-dossier--concise">
      <header className="portal-dossier-header">
        <div className="portal-dossier-header-main">
          <h2>{memberDossier.name}</h2>
          <p className="portal-dossier-membership">{memberDossier.membershipStatus}</p>
        </div>
        <span className="portal-verified-badge">Verified Member</span>
      </header>
      <div className="portal-dossier-body">
        <DossierBlock label="Primary Club" items={[memberDossier.primaryClub]} />
        <DossierBlock label="Location" items={[memberDossier.location]} />
        <DossierBlock label="Industry" items={[memberDossier.industry]} />
        <DossierBlock label="Business Interests" items={memberDossier.businessInterests} />
        <DossierBlock label="Available Regions" items={memberDossier.availableRegions} />
        <DossierBlock label="Current Request" items={[memberDossier.currentRequest]} />
      </div>
    </article>
  );
}
