import { featureHeroes } from "../data/content";

export function EditorialImagery() {
  return (
    <section className="editorial-row" aria-label="EliteTee editorial imagery">
      <div className="editorial-row-cards">
        {featureHeroes.map((item) => (
          <article key={item.title} className="editorial-card editorial-card--overlay">
            <div className="editorial-card-media">
              <img
                src={item.image}
                alt={item.alt}
                loading="lazy"
                decoding="async"
                {...(item.objectPosition
                  ? { style: { objectPosition: item.objectPosition } }
                  : {})}
              />
              <div className="editorial-card-scrim" aria-hidden />
              <div className="editorial-card-overlay-copy layout">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
