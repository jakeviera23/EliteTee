import { membershipWorksSteps } from "../data/content";

export function HowMembershipWorks() {
  return (
    <section
      id="how-membership-works"
      className="section section--compact membership-works"
      aria-labelledby="membership-works-heading"
    >
      <div className="layout">
        <header className="membership-works-header">
          <p className="membership-works-eyebrow">The process</p>
          <h2 id="membership-works-heading">How it works</h2>
          <p className="membership-works-lead">Three quiet steps. One membership desk.</p>
        </header>

        <ol className="membership-works-steps">
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
