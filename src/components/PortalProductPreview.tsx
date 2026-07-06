import { publicEarlyStageCopy } from "../data/content";

const previewCards = [
  {
    id: "feed",
    sectionId: "feed-preview",
    title: "Feed",
    description: "Share rounds, photos, and stories as the community grows.",
    src: "/images/homepage/homepage-feed.jpg",
    alt: "Coastal links green beside the sea",
  },
  {
    id: "courses",
    title: "Courses",
    description: "Preview featured courses — member posts and recommendations will follow.",
    src: "/images/homepage/homepage-courses.jpg",
    alt: "Clifftop green and bunker with a resort clubhouse above the coast",
  },
  {
    id: "discover",
    sectionId: "discover-preview",
    title: "Discover",
    description: "Find golfers and destinations as approved members join EliteTee.",
    src: "/images/homepage/homepage-discover.jpg",
    alt: "Rolling fairways at golden hour",
  },
  {
    id: "messages",
    title: "Messages",
    description: "Connect through golf with thoughtful conversations and trusted relationships.",
    src: "/images/homepage/homepage-messages.jpg",
    alt: "Coastal green beside cliffs and the sea",
  },
  {
    id: "profile",
    title: "Profile",
    description: "Show your golf journey — home course, favorite courses, travel, and recent rounds.",
    src: "/images/homepage/homepage-profile.jpg",
    alt: "Clubhouse patio overlooking the course and coast",
  },
];

export function PortalProductPreview() {
  return (
    <section
      id="feed-preview"
      className="section section--lined section--compact portal-product-preview"
      aria-labelledby="portal-preview-heading"
    >
      <div className="layout">
        <header className="section-intro section-intro--compact">
          <p className="section-eyebrow">{publicEarlyStageCopy.earlyCommunity}</p>
          <h2 id="portal-preview-heading">Inside EliteTee</h2>
          <p className="section-lead">
            A curated golf community for serious golfers to share rounds, discover courses, and
            build trusted relationships through the game.
          </p>
          <p className="section-note">{publicEarlyStageCopy.activityGrows}</p>
        </header>

        <ul className="portal-product-preview-grid">
          {previewCards.map((card) => (
            <li key={card.id} id={card.sectionId}>
              <article className="portal-product-preview-card">
                <div className="portal-product-preview-media">
                  <img
                    src={card.src}
                    alt={card.alt}
                    loading="lazy"
                    decoding="async"
                    style={{ objectFit: "cover", objectPosition: "center" }}
                  />
                  <span className="portal-product-preview-label">{card.title}</span>
                </div>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
