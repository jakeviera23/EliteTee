import { memberStandards, memberStandardsLead } from "../data/content";

export function MemberStandards() {
  return (
    <section
      id="standards"
      className="section section--compact standards standards--dark"
      aria-labelledby="standards-heading"
    >
      <div className="layout standards-layout">
        <header className="standards-statement">
          <p className="standards-statement-title">{memberStandardsLead}</p>
        </header>

        <div className="standards-body">
          <header className="standards-intro">
            <h2 id="standards-heading">Standards</h2>
          </header>
          <ul className="standards-list standards-list--dark">
            {memberStandards.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
