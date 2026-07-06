import { Link } from "react-router-dom";
import type { MouseEvent } from "react";
import { photos } from "../assets/photos";

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
    <section className="hero-cinematic" aria-labelledby="hero-heading">
      <img
        className="hero-cinematic-bg"
        src={photos.heroCoastal}
        alt="Golfer on a coastal fairway overlooking the ocean"
        loading="eager"
        decoding="async"
        fetchPriority="high"
      />
      <div className="hero-cinematic-overlay" aria-hidden />
      <div className="hero-cinematic-inner layout">
        <div className="hero-cinematic-copy">
          <p className="hero-cinematic-eyebrow">Curated golf community</p>
          <h1 id="hero-heading" className="hero-cinematic-title">
            Golf&apos;s Highest-Quality Social Community.
          </h1>
          <p className="hero-cinematic-desc">
            A curated golf community for serious golfers to share rounds, discover courses, and
            build trusted relationships through the game.
          </p>
          <div className="hero-actions hero-cinematic-actions">
            <a href="/#apply" className="btn-hero btn-hero--primary" onClick={scrollToApply}>
              Join EliteTee
            </a>
            <Link to="/login" className="btn-hero btn-hero--ghost">
              Sign In
            </Link>
          </div>
          <p className="hero-cinematic-note">
            Not the biggest golf community — the highest-quality one. Curated membership for
            serious golfers.
          </p>
        </div>
      </div>
    </section>
  );
}
