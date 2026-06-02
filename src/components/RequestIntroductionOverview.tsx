import { requestIntroductionBullets } from "../data/content";

export function RequestIntroductionOverview() {
  return (
    <section
      id="request-overview"
      className="section section--lined section--compact request-overview"
      aria-labelledby="request-overview-heading"
    >
      <div className="layout">
        <header className="section-intro section-intro--compact">
          <h2 id="request-overview-heading">Request an Introduction</h2>
          <p className="section-lead request-overview-lead">
            Approved members may submit private introduction requests based on travel plans,
            business interests, geography, or personal connections they wish to build.
          </p>
        </header>

        <ul className="request-overview-list">
          {requestIntroductionBullets.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
