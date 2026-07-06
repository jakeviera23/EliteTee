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
          <h2 id="priorities-heading">Why EliteTee Exists</h2>
          <p className="priorities-lead">{membershipSocietyLead}</p>
          <p className="priorities-sublead">
            Golf deserves a higher-quality social home built around rounds, courses, travel, and
            trusted relationships — curated for serious golfers, not built for scale alone.
          </p>
        </header>
      </div>
    </section>
  );
}
