import { memberBenefits } from "../data/content";

export function WhatMembersReceive() {
  return (
    <section
      id="members-receive"
      className="section section--lined section--compact members-receive"
      aria-labelledby="members-receive-heading"
    >
      <div className="layout">
        <header className="section-intro section-intro--compact">
          <h2 id="members-receive-heading">What members receive</h2>
          <p className="section-lead members-receive-lead">
            Membership is built around relationships first. Golf and hospitality may follow
            through trusted introductions—never guaranteed access or tee times.
          </p>
        </header>

        <ul className="members-receive-grid">
          {memberBenefits.map((item) => (
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
