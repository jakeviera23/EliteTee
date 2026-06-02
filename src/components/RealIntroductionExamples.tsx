import { realEliteTeeExamples } from "../data/content";

export function RealIntroductionExamples() {
  return (
    <section
      id="real-introduction-examples"
      className="section section--compact real-introduction-examples"
      aria-labelledby="real-introduction-examples-heading"
    >
      <div className="layout">
        <header className="section-intro section-intro--compact">
          <h2 id="real-introduction-examples-heading">
            Real Examples of EliteTee Introductions
          </h2>
          <p className="section-lead real-introduction-examples-lead">
            How members may use EliteTee once approved.
          </p>
        </header>

        <ul className="members-receive-grid members-receive-grid--three">
          {realEliteTeeExamples.map((item) => (
            <li key={item.title}>
              <article className="members-receive-card">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            </li>
          ))}
        </ul>

        <p className="real-introduction-examples-note">
          Introductions are reviewed individually and made only when fit, trust, and purpose
          are aligned.
        </p>
      </div>
    </section>
  );
}
