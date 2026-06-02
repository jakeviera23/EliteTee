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
          <p className="hero-cinematic-eyebrow">Private member society</p>
          <h1 id="hero-heading" className="hero-cinematic-title">
            Accomplished members, connected through golf.
          </h1>
          <p className="hero-cinematic-desc">
            A private society of verified club members where golf creates trusted
            relationships, introductions, travel opportunities, and long-term connections.
          </p>
        </div>
      </div>
    </section>
  );
}
