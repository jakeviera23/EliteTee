import { platformFeatures } from "../data/content";

export function WhatMembersReceive() {
  return (
    <section
      id="members-receive"
      className="section section--lined section--compact members-receive"
      aria-labelledby="members-receive-heading"
    >
      <div className="layout">
        <header className="section-intro section-intro--compact">
          <h2 id="members-receive-heading">Built for Serious Golfers</h2>
          <p className="section-lead members-receive-lead">
            A curated community to share rounds, discover great courses, and build trusted
            relationships through the game.
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
