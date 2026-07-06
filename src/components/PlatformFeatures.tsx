import { platformFeatures } from "../data/content";

export function PlatformFeatures() {
  return (
    <section
      className="section section--lined section--compact platform-features"
      aria-labelledby="platform-features-heading"
    >
      <div className="layout">
        <header className="section-intro section-intro--compact">
          <h2 id="platform-features-heading" className="visually-hidden">
            EliteTee platform features
          </h2>
        </header>

        <ul className="members-receive-grid platform-features-grid">
          {platformFeatures.map((item) => (
            <li key={item.id} id={item.id}>
              <article className="members-receive-card platform-feature-card">
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
