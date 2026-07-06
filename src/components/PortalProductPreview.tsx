import { photos } from "../assets/photos";

const portalScreens = [
  {
    id: "feed",
    title: "Feed",
    description: "Share rounds, photos, and stories as the community grows.",
    image: photos.swingHorizon,
  },
  {
    id: "courses",
    title: "Courses",
    description: "Preview featured courses — member posts and recommendations will follow.",
    image: photos.coursePebbleBeach,
  },
  {
    id: "discover",
    title: "Discover",
    description: "Find golfers and destinations as approved members join EliteTee.",
    image: photos.coastAerial,
  },
  {
    id: "messages",
    title: "Messages",
    description: "Connect through golf with thoughtful conversations and trusted relationships.",
    image: photos.clubhouseEveningLuxury,
  },
  {
    id: "profile",
    title: "Profile",
    description: "Show your golf journey — home course, favorite courses, travel, and recent rounds.",
    image: photos.founderPortrait,
  },
];

export function PortalProductPreview() {
  return (
    <section
      className="section section--lined section--compact portal-product-preview"
      aria-labelledby="portal-preview-heading"
    >
      <div className="layout">
        <header className="section-intro section-intro--compact">
          <h2 id="portal-preview-heading">Inside EliteTee</h2>
          <p className="section-lead">
            A curated golf community for serious golfers to share rounds, discover courses, and
            build trusted relationships through the game.
          </p>
        </header>

        <ul className="portal-product-preview-grid">
          {portalScreens.map((screen) => (
            <li key={screen.id}>
              <article className="portal-product-preview-card">
                <div className="portal-product-preview-media">
                  <img src={screen.image} alt="" loading="lazy" decoding="async" />
                  <span className="portal-product-preview-label">{screen.title}</span>
                </div>
                <h3>{screen.title}</h3>
                <p>{screen.description}</p>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
