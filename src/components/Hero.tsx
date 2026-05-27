import { photos } from "../assets/photos";

export function Hero() {
  return (
    <section className="hero-cinematic" aria-labelledby="hero-heading">
      <img
        className="hero-cinematic-bg"
        src={photos.heroSwingOceanLuxury}
        alt="Golfer in follow-through on a coastal course at golden hour"
        loading="eager"
        decoding="async"
        fetchPriority="high"
      />
      <div className="hero-cinematic-overlay" aria-hidden />
      <div className="hero-cinematic-inner layout">
        <h1 id="hero-heading" className="hero-cinematic-title">
          Private golf travel, handled quietly.
        </h1>
        <p className="hero-cinematic-desc">
          Discreet introductions for verified club members who host, travel, and value
          private ground.
        </p>
      </div>
    </section>
  );
}
