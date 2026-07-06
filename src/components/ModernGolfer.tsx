import { modernGolfer } from "../data/content";

export function ModernGolfer() {
  return (
    <section
      id="modern-golfer"
      className="section section--compact modern-golfer"
      aria-labelledby="modern-golfer-heading"
    >
      <div className="layout">
        <header className="section-intro section-intro--compact modern-golfer-intro">
          <h2 id="modern-golfer-heading">{modernGolfer.title}</h2>
          <p className="section-lead modern-golfer-lead">{modernGolfer.lead}</p>
          <p className="modern-golfer-copy">{modernGolfer.description}</p>
        </header>
      </div>
    </section>
  );
}
