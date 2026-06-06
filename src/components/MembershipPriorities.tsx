import { membershipPriorities, membershipPrioritiesLead } from "../data/content";

export function MembershipPriorities() {
  return (
    <section
      id="what"
      className="section section--compact priorities"
      aria-labelledby="priorities-heading"
    >
      <div className="layout priorities-layout">
        <header className="priorities-intro">
          <p className="priorities-eyebrow">Our society</p>
          <h2 id="priorities-heading">What we prioritize</h2>
          <p className="priorities-lead">{membershipPrioritiesLead}</p>
        </header>

        <ul className="priorities-grid">
          {membershipPriorities.map((item) => (
            <li key={item.title} className="priorities-item">
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
