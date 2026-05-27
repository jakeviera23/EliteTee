import { memberStandards } from "../data/content";

export function MemberStandards() {
  return (
    <section
      id="standards"
      className="section section--tight standards"
      aria-labelledby="standards-heading"
    >
      <div className="layout">
        <header className="section-intro section-intro--tight">
          <h2 id="standards-heading">Standards</h2>
          <p className="section-lead standards-lead">
            Membership relies on discretion, etiquette, and good standing.
          </p>
        </header>
        <ul className="standards-list standards-list--tight">
          {memberStandards.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
