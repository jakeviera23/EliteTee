import { publicEarlyStageCopy } from "../data/content";

const previewCards = [
  {
    id: "feed",
    sectionId: "feed-preview",
    title: "Feed",
    description:
      "Share rounds, ask for introductions, find games while traveling, and learn where members are playing.",
    src: "/images/homepage/product-feed.png",
    alt: "EliteTee Feed page — post a round, request a game, or ask for an introduction",
    objectPosition: "top",
  },
  {
    id: "courses",
    title: "Courses",
    description:
      "Discover the world's greatest golf courses through trusted member reviews, recommendations, and travel plans.",
    src: "/images/homepage/product-courses.png",
    alt: "EliteTee Courses page — course cards, filters, and Course Signals",
    objectPosition: "top",
  },
  {
    id: "discover",
    sectionId: "discover-preview",
    title: "Discover",
    description:
      "Search members by club, location, destination, and interests to build meaningful golf connections.",
    src: "/images/homepage/product-discover.png",
    alt: "EliteTee Discover page — find golfers, filters, and Travel Board",
    objectPosition: "top",
  },
  {
    id: "messages",
    title: "Messages",
    description:
      "Start thoughtful conversations around rounds, travel, introductions, and shared golf interests.",
    src: "/images/homepage/product-messages.png",
    alt: "EliteTee Messages page — member conversations and threads",
    objectPosition: "top",
  },
  {
    id: "profile",
    title: "Profile",
    description:
      "Show your golf identity — home club, favorite courses, travel plans, recent rounds, and connections.",
    src: "/images/homepage/product-profile.png",
    alt: "EliteTee Profile page — golfer identity, stats, and course lists",
    objectPosition: "top",
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
                    style={{ objectFit: "cover", objectPosition: card.objectPosition ?? "center" }}
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
