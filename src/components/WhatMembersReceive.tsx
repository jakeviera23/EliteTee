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
          <h2 id="members-receive-heading">What Members Receive</h2>
          <p className="section-lead members-receive-lead">
            A private network helping golfers expand their circle through trusted
            introductions, travel connections, and shared opportunities.
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
