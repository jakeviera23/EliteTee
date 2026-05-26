import { memberStandards } from "../data/content";

export function MemberStandards() {
  return (
    <section id="standards" className="section standards" aria-labelledby="standards-heading">
      <div className="layout">
        <header className="section-intro">
          <h2 id="standards-heading">Member standards</h2>
          <p className="section-lead">
            The desk declines introductions when conduct or standing does not meet these
            expectations.
          </p>
        </header>
        <ul className="standards-list">
          {memberStandards.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
