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
          <p className="hero-cinematic-eyebrow">Private member network</p>
          <h1 id="hero-heading" className="hero-cinematic-title">
            Expand Your Golf and Business Network Beyond Your Home Club.
          </h1>
          <p className="hero-cinematic-desc">
            A private member network built for accomplished golfers who value
            relationships beyond their home club.
          </p>
        </div>
      </div>
    </section>
  );
}
