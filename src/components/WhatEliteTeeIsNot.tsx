import { eliteTeeIsNotItems } from "../data/content";

export function WhatEliteTeeIsNot() {
  return (
    <section
      id="what-is-not"
      className="section section--compact what-is-not"
      aria-labelledby="what-is-not-heading"
    >
      <div className="layout what-is-not-layout">
        <header className="section-intro section-intro--compact what-is-not-intro">
          <h2 id="what-is-not-heading">What EliteTee is not</h2>
          <p className="section-lead what-is-not-lead">
            Clarity protects the society and the clubs members represent.
          </p>
        </header>

        <div className="what-is-not-body">
          <p className="what-is-not-tagline">
            EliteTee facilitates relationships. It does not sell access.
          </p>

          <ul className="what-is-not-list">
            {eliteTeeIsNotItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <p className="what-is-not-closing">
            EliteTee does not broker tee times, guarantee reciprocity, or list courses for
            public booking.
          </p>
        </div>
      </div>
    </section>
  );
}
