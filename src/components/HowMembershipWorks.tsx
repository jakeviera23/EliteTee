import { membershipWorksLead, membershipWorksSteps } from "../data/content";

export function HowMembershipWorks() {
  return (
    <section
      id="membership"
      className="section section--compact membership-works"
      aria-labelledby="membership-works-heading"
    >
      <div className="layout">
        <header className="membership-works-header">
          <h2 id="membership-works-heading">Membership</h2>
          <p className="membership-works-lead">{membershipWorksLead}</p>
        </header>

        <ol className="membership-works-steps membership-works-steps--five">
          {membershipWorksSteps.map((item) => (
            <li key={item.step} className="membership-works-step">
              <span className="membership-works-step-num" aria-hidden="true">
                {item.step}
              </span>
              <h3 className="membership-works-step-title">{item.title}</h3>
              <p className="membership-works-step-desc">{item.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
