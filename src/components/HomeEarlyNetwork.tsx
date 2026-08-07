import { homeEarlyNetwork } from "../data/homePage";

export function HomeEarlyNetwork() {
  return (
    <section
      id="early-network"
      className="home-section home-early"
      aria-labelledby="home-early-heading"
    >
      <div className="layout home-section-inner">
        <header className="home-section-header">
          <h2 id="home-early-heading">{homeEarlyNetwork.title}</h2>
        </header>
        <ul className="home-early-grid">
          {homeEarlyNetwork.points.map((point) => (
            <li key={point.id}>
              <article className="home-early-card">
                <h3>{point.title}</h3>
                <p>{point.description}</p>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
