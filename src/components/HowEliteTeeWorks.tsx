import { eliteTeeWorksSteps } from "../data/content";

export function HowEliteTeeWorks() {
  return (
    <section
      id="how-it-works"
      className="section how-works"
      aria-labelledby="how-it-works-heading"
    >
      <div className="layout">
        <header className="how-works-header">
          <p className="how-works-eyebrow">Membership desk</p>
          <h2 id="how-it-works-heading">How Elite Tee works</h2>
        </header>

        <ol className="how-works-steps">
          {eliteTeeWorksSteps.map((item) => (
            <li key={item.step} className="how-works-step">
              <span className="how-works-step-num" aria-hidden="true">
                {item.step}
              </span>
              <p className="how-works-step-text">{item.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
