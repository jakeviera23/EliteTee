import { platformFeatures } from "../data/content";

export function RequestIntroductionOverview() {
  return (
    <section
      id="request-overview"
      className="section section--lined section--compact request-overview"
      aria-labelledby="request-overview-heading"
    >
      <div className="layout">
        <header className="section-intro section-intro--compact">
          <h2 id="request-overview-heading">Request Membership</h2>
          <p className="section-lead request-overview-lead">
            Request membership to share rounds, discover courses, and connect with serious golfers
            in the EliteTee community.
          </p>
        </header>

        <ul className="request-overview-list">
          {platformFeatures.map((item) => (
            <li key={item.id}>{item.title}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
