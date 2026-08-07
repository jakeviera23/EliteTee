import { Link } from "react-router-dom";
import type { MouseEvent } from "react";
import { homeCtaCopy } from "../data/homePage";

function scrollToApply(event: MouseEvent<HTMLAnchorElement>) {
  if (window.location.pathname !== "/") return;

  event.preventDefault();
  const target = document.getElementById("apply");
  if (target) {
    target.scrollIntoView({ block: "start" });
    window.history.pushState(null, "", "#apply");
  }
}

export function HomeCtaBand() {
  return (
    <section className="home-cta-simple" aria-labelledby="home-cta-heading">
      <div className="layout home-cta-simple-inner">
        <h2 id="home-cta-heading">{homeCtaCopy.title}</h2>
        <p className="home-cta-simple-desc">{homeCtaCopy.description}</p>
        <div className="home-cta-simple-actions">
          <a
            href="/#apply"
            className="btn-hero btn-hero--primary home-cta-simple-btn"
            onClick={scrollToApply}
          >
            {homeCtaCopy.button}
          </a>
          <Link to="/login" className="home-cta-simple-signin">
            {homeCtaCopy.signIn}
          </Link>
        </div>
      </div>
    </section>
  );
}
