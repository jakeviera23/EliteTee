import { platformFeatures } from "../data/content";

export function MemberIntroductionExamples() {
  return (
    <section
      id="introduction-examples"
      className="section section--compact introduction-examples"
      aria-labelledby="introduction-examples-heading"
    >
      <div className="layout">
        <header className="section-intro section-intro--compact">
          <h2 id="introduction-examples-heading">How EliteTee Works</h2>
          <p className="section-lead introduction-examples-lead">
            Share rounds, discover great courses, and build trusted relationships through the game.
          </p>
        </header>

        <ul className="members-receive-grid">
          {platformFeatures.map((item) => (
            <li key={item.id}>
              <article className="members-receive-card">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
