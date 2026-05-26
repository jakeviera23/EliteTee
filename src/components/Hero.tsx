import { photos } from "../assets/photos";

export function Hero() {
  return (
    <section className="hero-band hero-band--main hero-band--left" aria-labelledby="hero-heading">
      <img
        className="hero-band-bg"
        src={photos.heroCoastal}
        alt="Golfer on a coastal fairway at dusk"
        loading="eager"
        decoding="async"
        fetchPriority="high"
      />
      <div className="hero-band-overlay hero-band-overlay--base" aria-hidden />
      <div className="hero-band-overlay hero-band-overlay--text" aria-hidden />
      <div className="hero-band-inner layout">
        <div className="hero-copy">
          <p className="hero-eyebrow">Private member network</p>
          <h1 id="hero-heading" className="hero-band-title">
            Private golf travel, handled quietly.
          </h1>
          <p className="hero-band-desc">
            Discreet introductions for verified members who host abroad, travel with
            standing, and honor the customs of private ground.
          </p>
        </div>
      </div>
    </section>
  );
}
