import { photos } from "../assets/photos";

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
          <p className="hero-cinematic-eyebrow">Private golf network</p>
          <h1 id="hero-heading" className="hero-cinematic-title">
            Build Relationships Through Golf Beyond Your Home Club.
          </h1>
          <p className="hero-cinematic-desc">
            EliteTee connects private club golfers seeking meaningful relationships,
            new opportunities, and trusted introductions across golf, business, and
            travel.
          </p>
          <p className="hero-cinematic-note">
            EliteTee is currently building its founding member network with a limited
            number of early applicants.
          </p>
        </div>
      </div>
    </section>
  );
}
