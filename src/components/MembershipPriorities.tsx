import { membershipSocietyLead } from "../data/content";

export function MembershipPriorities() {
  return (
    <section
      id="society"
      className="section section--compact priorities priorities--society"
      aria-labelledby="priorities-heading"
    >
      <div className="layout">
        <header className="section-intro section-intro--compact priorities-intro">
          <h2 id="priorities-heading">Society</h2>
          <p className="priorities-lead">{membershipSocietyLead}</p>
        </header>
      </div>
    </section>
  );
}
