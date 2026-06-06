import { memberStandards } from "../data/content";

export function MemberStandards() {
  return (
    <section
      id="standards"
      className="section section--compact standards standards--dark"
      aria-labelledby="standards-heading"
    >
      <div className="layout standards-layout">
        <header className="standards-statement">
          <p className="standards-statement-title">
            Some places are not booked. They are introduced.
          </p>
          <p className="standards-statement-lead">
            EliteTee exists for members who value reciprocity and the community private
            golf creates.
          </p>
        </header>

        <div className="standards-body">
          <header className="standards-intro">
            <h2 id="standards-heading">Member standards</h2>
            <p className="standards-body-lead">
              The desk declines membership when conduct or standing does not meet these
              expectations.
            </p>
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
