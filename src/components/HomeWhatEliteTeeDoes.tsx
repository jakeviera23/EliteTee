import { homeWhatEliteTeeDoes } from "../data/homePage";

export function HomeWhatEliteTeeDoes() {
  return (
    <section
      id="network"
      className="home-section home-features"
      aria-labelledby="home-features-heading"
    >
      <div className="layout home-section-inner">
        <header className="home-section-header">
          <h2 id="home-features-heading">{homeWhatEliteTeeDoes.title}</h2>
          <p className="home-section-lead">{homeWhatEliteTeeDoes.intro}</p>
        </header>
        <ul className="home-features-grid">
          {homeWhatEliteTeeDoes.features.map((feature) => (
            <li key={feature.id}>
              <article className="home-feature-card">
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
