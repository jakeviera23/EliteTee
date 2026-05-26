import { hostRegions, regionsHero } from "../data/content";
import { HeroBand } from "./HeroBand";

export function HostRegions() {
  return (
    <>
      <HeroBand
        id="regions"
        image={regionsHero.image}
        alt={regionsHero.alt}
        title="Example host regions"
        description="Illustrative names only—not partner clubs or public affiliations."
        align="left"
      />

      <section className="regions-list-section" aria-label="Host region examples">
        <div className="layout">
          <ul className="regions-list">
            {hostRegions.map((region) => (
              <li key={region.name} className="regions-list-item">
                <div className="regions-list-head">
                  <h3>{region.name}</h3>
                  <span>{region.area}</span>
                </div>
                <p>{region.note}</p>
              </li>
            ))}
          </ul>
          <a href="#request" className="regions-more">
            Request an introduction <span aria-hidden>→</span>
          </a>
        </div>
      </section>
    </>
  );
}
