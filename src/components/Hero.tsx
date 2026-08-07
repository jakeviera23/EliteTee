import { Link } from "react-router-dom";
import type { MouseEvent } from "react";
import { photos } from "../assets/photos";
import { homeHeroCopy } from "../data/homePage";

function scrollToApply(event: MouseEvent<HTMLAnchorElement>) {
  if (window.location.pathname !== "/") return;

  event.preventDefault();
  const target = document.getElementById("apply");
  if (target) {
    target.scrollIntoView({ block: "start" });
    window.history.pushState(null, "", "#apply");
  }
}

export function Hero() {
  return (
    <section className="hero-cinematic hero-cinematic--credible" aria-labelledby="hero-heading">
      <img
        className="hero-cinematic-bg"
        src={photos.heroCoastal}
        alt="Golfer on a coastal fairway overlooking the ocean"
        loading="eager"
        decoding="async"
        fetchPriority="high"
        style={{ objectFit: "cover", objectPosition: "center" }}
      />
      <div className="hero-cinematic-overlay" aria-hidden />
      <div className="hero-cinematic-inner layout">
        <div className="hero-cinematic-copy">
          <p className="hero-cinematic-eyebrow">{homeHeroCopy.eyebrow}</p>
          <h1 id="hero-heading" className="hero-cinematic-title">
            {homeHeroCopy.title}
          </h1>
          <p className="hero-cinematic-desc">{homeHeroCopy.description}</p>
          <div className="hero-actions hero-cinematic-actions">
            <a href="/#apply" className="btn-hero btn-hero--primary" onClick={scrollToApply}>
              {homeHeroCopy.primaryCta}
            </a>
            <Link to="/login" className="btn-hero btn-hero--ghost">
              {homeHeroCopy.signIn}
            </Link>
          </div>
          <p className="hero-cinematic-trust">{homeHeroCopy.trustLine}</p>
        </div>
      </div>
    </section>
  );
}
