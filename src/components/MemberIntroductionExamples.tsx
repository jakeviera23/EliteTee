import { introductionExamples } from "../data/content";

export function MemberIntroductionExamples() {
  return (
    <section
      id="introduction-examples"
      className="section section--compact introduction-examples"
      aria-labelledby="introduction-examples-heading"
    >
      <div className="layout">
        <header className="section-intro section-intro--compact">
          <h2 id="introduction-examples-heading">Examples of Member Introductions</h2>
          <p className="section-lead introduction-examples-lead">
            Introductions shaped by geography, travel, industry, and shared interests.
          </p>
        </header>

        <ul className="members-receive-grid">
          {introductionExamples.map((item) => (
            <li key={item.title}>
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
